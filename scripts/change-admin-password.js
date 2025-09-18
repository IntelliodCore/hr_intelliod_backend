import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function changeAdminPassword() {
    try {
        console.log('🔐 Admin Password Change Tool\n');

        // Find admin user
        const admin = await prisma.user.findFirst({
            where: {
                role: 'ADMIN',
                email: 'admin@intelliod.com'
            }
        });

        if (!admin) {
            console.log('❌ Admin user not found. Please run the seed script first.');
            return;
        }

        console.log(`📧 Found admin user: ${admin.email}`);

        const newPassword = await askQuestion('🔑 Enter new password: ');

        if (newPassword.length < 6) {
            console.log('❌ Password must be at least 6 characters long.');
            return;
        }

        const confirmPassword = await askQuestion('🔑 Confirm new password: ');

        if (newPassword !== confirmPassword) {
            console.log('❌ Passwords do not match.');
            return;
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update the admin password
        await prisma.user.update({
            where: { id: admin.id },
            data: {
                password: hashedPassword,
                isFirstLogin: false
            }
        });

        console.log('✅ Admin password updated successfully!');
        console.log('📧 Email: admin@intelliod.com');
        console.log('🔑 New password: [hidden for security]');

    } catch (error) {
        console.error('❌ Error changing password:', error.message);
    } finally {
        rl.close();
        await prisma.$disconnect();
    }
}

changeAdminPassword();