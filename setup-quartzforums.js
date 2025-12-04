const { connect, implementationKeys } = require('./database.js');
require('dotenv').config();

async function setupImplementationKeys() {
    try {
        const MONGO_URI = process.env.DB_URL;
        if (!MONGO_URI) {
            console.error("No MONGO_URI environment variable has been defined");
            process.exit(1);
        }

        await connect(MONGO_URI);
        console.log('Connected to database');

        // Create a sample implementation key for testing
        const sampleKey = {
            implementationKey: 'test-key-123',
            domain: 'localhost:3000',
            disabled: false
        };

        const existing = await implementationKeys.findOne({ implementationKey: sampleKey.implementationKey });
        if (!existing) {
            await implementationKeys.create(sampleKey);
            console.log('Created sample implementation key:', sampleKey);
        } else {
            console.log('Sample implementation key already exists');
        }

        console.log('Setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setupImplementationKeys();