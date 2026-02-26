import prisma from './src/lib/prisma';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Setting up IEC 104 Hardware with provided parameters...");

    // 1. Get a Plant
    let firstPlant = await prisma.plant.findFirst();
    if (!firstPlant) {
        console.error("No plant found. Creating a dummy plant first...");
        // Create company if needed
        let company = await prisma.companyProfile.findFirst();
        if (!company) {
            company = await prisma.companyProfile.create({
                data: {
                    name: "Test Company",
                    taxOffice: "ANKARA",
                    taxNumber: 1234567890,
                    address: "Test Address"
                }
            });
        }

        const plant = await prisma.plant.create({
            data: {
                company_id: company.id,
                plantName: "Test Power Plant",
                plantType: "SOLAR"
            }
        });
        firstPlant = plant;
    }

    // 2. Create or update ProtocolConfig
    const protocolName = "Hardware Test 104";
    let protocol = await prisma.protocolConfig.findFirst({
        where: { configName: protocolName }
    });

    const iecConfigData = {
        ipAddress: "178.242.103.255",
        port: 2404,
        asduAddr: 15644,
        t0: 30,
        t1: 15,
        t2: 10,
        t3: 20,
        k: 12,
        w: 8
    };

    if (protocol) {
        console.log("Updating existing protocol...");
        protocol = await prisma.protocolConfig.update({
            where: { id: protocol.id },
            data: {
                iec104Config: {
                    upsert: {
                        create: iecConfigData,
                        update: iecConfigData
                    }
                }
            }
        });
    } else {
        console.log("Creating new protocol...");
        protocol = await prisma.protocolConfig.create({
            data: {
                plant_id: firstPlant.id,
                configName: protocolName,
                protocolType: 'IEC104',
                iec104Config: {
                    create: iecConfigData
                }
            }
        });
    }

    // 3. Create a Datasheet Profile and some points if they don't exist
    let profile = await prisma.datasheetProfile.findFirst({
        where: { name: "104 Hardware Profile" }
    });

    if (!profile) {
        profile = await prisma.datasheetProfile.create({
            data: {
                name: "104 Hardware Profile",
                protocolType: "IEC104"
            }
        });
    }

    // Add some test points based on typical IEC 104 IOA (e.g., IOA 100, 101)
    const testPoints = [
        { dataName: "Active Power", scadaAddress: 100, dataType: "Float32" },
        { dataName: "Voltage", scadaAddress: 101, dataType: "Float32" },
        { dataName: "Current", scadaAddress: 102, dataType: "Float32" }
    ];

    for (const p of testPoints) {
        const existingPoint = await prisma.datasheetPoint.findFirst({
            where: {
                profile_id: profile.id,
                dataName: p.dataName
            }
        });

        if (existingPoint) {
            console.log(`Updating point: ${p.dataName}`);
            await prisma.datasheetPoint.update({
                where: { id: existingPoint.id },
                data: { scadaAddress: p.scadaAddress }
            });
        } else {
            console.log(`Creating point: ${p.dataName}`);
            await prisma.datasheetPoint.create({
                data: {
                    profile_id: profile.id,
                    dataName: p.dataName,
                    scadaAddress: p.scadaAddress,
                    dataType: p.dataType
                }
            });
        }
    }

    // 4. Create a Device linked to this protocol and profile
    let deviceResult = await prisma.device.findFirst({
        where: { deviceName: "104 Test Device" }
    });

    if (deviceResult) {
        await prisma.device.update({
            where: { id: deviceResult.id },
            data: {
                protocol_config_id: protocol.id,
                datasheet_profile_id: profile.id
            }
        });
    } else {
        await prisma.device.create({
            data: {
                deviceName: "104 Test Device",
                deviceType: "ANALYZER",
                protocol_config_id: protocol.id,
                datasheet_profile_id: profile.id
            }
        });
    }

    console.log("Setup complete. Hardware parameters applied.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
