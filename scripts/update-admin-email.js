import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminEmail() {
    try {
        console.log('📧 Updating Admin Email...\n');

        // Find current admin user
        const currentAdmin = await prisma.user.findFirst({
            where: {
                role: 'ADMIN',
                email: 'admin@company.com'
            }
        });

        if (!currentAdmin) {
            console.log('❌ Admin user with email admin@company.com not found.');
            return;
        }

        console.log(`📧 Found admin user: ${currentAdmin.email}`);

        // Update the admin email
        const updatedAdmin = await prisma.user.update({
            where: { id: currentAdmin.id },
            data: {
                email: 'admin@intelliod.com'
            }
        });

        console.log('✅ Admin email updated successfully!');
        console.log(`📧 Old email: admin@company.com`);
        console.log(`📧 New email: ${updatedAdmin.email}`);

    } catch (error) {
        console.error('❌ Error updating admin email:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateAdminEmail();