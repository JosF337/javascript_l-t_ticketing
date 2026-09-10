require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Comment = require('./models/Comment');
const SlaRule = require('./models/SlaRule');
const Rating = require('./models/Rating');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/helpdesk_db';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');

    // Clear existing data
    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Ticket.deleteMany({}),
      Comment.deleteMany({}),
      SlaRule.deleteMany({}),
      Rating.deleteMany({})
    ]);

    console.log('Seeding SLA Rules (Module 10)...');
    const slaRules = await SlaRule.insertMany([
      { category: 'Software', priority: 'Urgent', resolutionHours: 4 },
      { category: 'Software', priority: 'High', resolutionHours: 12 },
      { category: 'Software', priority: 'Medium', resolutionHours: 24 },
      { category: 'Software', priority: 'Low', resolutionHours: 48 },

      { category: 'Hardware', priority: 'Urgent', resolutionHours: 6 },
      { category: 'Hardware', priority: 'High', resolutionHours: 24 },
      { category: 'Hardware', priority: 'Medium', resolutionHours: 48 },
      { category: 'Hardware', priority: 'Low', resolutionHours: 72 },

      { category: 'Network', priority: 'Urgent', resolutionHours: 4 },
      { category: 'Network', priority: 'High', resolutionHours: 8 },
      { category: 'Network', priority: 'Medium', resolutionHours: 16 },
      { category: 'Network', priority: 'Low', resolutionHours: 24 },

      { category: 'Billing', priority: 'Urgent', resolutionHours: 8 },
      { category: 'Billing', priority: 'High', resolutionHours: 24 },
      { category: 'Billing', priority: 'Medium', resolutionHours: 48 },
      { category: 'Billing', priority: 'Low', resolutionHours: 72 }
    ]);
    console.log(`Seeded ${slaRules.length} SLA rules.`);

    console.log('Seeding Users (Customer, Agent, Manager, Admin)...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@helpdesk.com',
      passwordHash,
      role: 'admin'
    });

    const manager = await User.create({
      name: 'Manager Sarah',
      email: 'manager@helpdesk.com',
      passwordHash,
      role: 'manager'
    });

    const agent1 = await User.create({
      name: 'Agent Alice Cooper',
      email: 'agent1@helpdesk.com',
      passwordHash,
      role: 'agent'
    });

    const agent2 = await User.create({
      name: 'Agent Bob Miller',
      email: 'agent2@helpdesk.com',
      passwordHash,
      role: 'agent'
    });

    const customer1 = await User.create({
      name: 'Customer Charlie Green',
      email: 'customer1@helpdesk.com',
      passwordHash,
      role: 'customer'
    });

    const customer2 = await User.create({
      name: 'Customer Diana Prince',
      email: 'customer2@helpdesk.com',
      passwordHash,
      role: 'customer'
    });

    console.log('Users seeded successfully:');
    console.log('  Admin:     admin@helpdesk.com / Password@123');
    console.log('  Manager:   manager@helpdesk.com / Password@123');
    console.log('  Agent 1:   agent1@helpdesk.com / Password@123');
    console.log('  Agent 2:   agent2@helpdesk.com / Password@123');
    console.log('  Customer 1: customer1@helpdesk.com / Password@123');
    console.log('  Customer 2: customer2@helpdesk.com / Password@123');

    console.log('Seeding Sample Tickets in various lifecycle stages...');
    const now = Date.now();

    // 1. Open ticket
    const ticketOpen = await Ticket.create({
      customerId: customer1._id,
      title: 'Cannot access internal VPN portal',
      category: 'Network',
      priority: 'High',
      description: 'Since 9 AM, VPN client displays authentication timeout when connecting.',
      status: 'Open',
      assignedAgentId: null,
      slaDueAt: new Date(now + 8 * 3600 * 1000)
    });

    // 2. In Progress ticket
    const ticketInProgress = await Ticket.create({
      customerId: customer2._id,
      title: 'Database connection pool exhausted in ERP',
      category: 'Software',
      priority: 'Urgent',
      description: 'The ERP application throws 500 error on checkout page due to DB pool exhaustion.',
      status: 'In Progress',
      assignedAgentId: agent1._id,
      slaDueAt: new Date(now + 4 * 3600 * 1000)
    });

    // 3. On Hold ticket
    const ticketOnHold = await Ticket.create({
      customerId: customer1._id,
      title: 'Replacement laptop monitor flickering',
      category: 'Hardware',
      priority: 'Medium',
      description: 'Screen flickers when connected via HDMI cable to external display.',
      status: 'On Hold',
      assignedAgentId: agent2._id,
      slaDueAt: new Date(now + 48 * 3600 * 1000)
    });

    // 4. Resolved ticket
    const ticketResolved = await Ticket.create({
      customerId: customer2._id,
      title: 'Incorrect invoice amount on monthly billing cycle',
      category: 'Billing',
      priority: 'Medium',
      description: 'Charged $250 instead of contracted $150 plan for May.',
      status: 'Resolved',
      assignedAgentId: agent1._id,
      slaDueAt: new Date(now + 24 * 3600 * 1000),
      resolvedAt: new Date(now - 2 * 3600 * 1000)
    });

    // 5. Closed ticket with rating
    const ticketClosed = await Ticket.create({
      customerId: customer1._id,
      title: 'Password reset request for corporate email',
      category: 'Software',
      priority: 'Low',
      description: 'Locked out of Office 365 mailbox after multiple failed attempts.',
      status: 'Closed',
      assignedAgentId: agent2._id,
      slaDueAt: new Date(now - 10 * 3600 * 1000),
      resolvedAt: new Date(now - 12 * 3600 * 1000),
      closedAt: new Date(now - 1 * 3600 * 1000)
    });

    // Seed Comments and Internal Notes
    await Comment.create({
      ticketId: ticketInProgress._id,
      authorId: customer2._id,
      message: 'Still seeing the 500 error when clicking confirm payment.',
      isInternal: false
    });

    await Comment.create({
      ticketId: ticketInProgress._id,
      authorId: agent1._id,
      message: 'Investigating database pool metrics in CloudWatch now.',
      isInternal: false
    });

    // Internal note (hidden from customer)
    await Comment.create({
      ticketId: ticketInProgress._id,
      authorId: agent1._id,
      message: '[INTERNAL NOTE] Suspected memory leak in query connection handler. Restarting instance 2.',
      isInternal: true
    });

    // Seed Rating
    await Rating.create({
      ticketId: ticketClosed._id,
      customerId: customer1._id,
      score: 5,
      comment: 'Super fast turnaround! Password reset link received within 15 minutes.'
    });

    console.log('Successfully seeded demo tickets, comments, internal notes, and rating.');
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during database seeding:', error.message);
    process.exit(1);
  }
};

seedData();
