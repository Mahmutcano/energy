
import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("🚀 Setting up Production IEC 104 Hardware in Database...");

    // 1. Get or Create Plant
    let targetPlant = await db.query.plant.findFirst();
    if (!targetPlant) {
        console.log("No plant found. Creating initial infrastructure...");
        const [newCompany] = await db.insert(schema.companyProfile).values({
            name: "Energy Pro Corp",
            taxOffice: "ANKARA",
            taxNumber: 99887766,
            address: "Tech Plaza #42"
        }).returning();

        const [newPlant] = await db.insert(schema.plant).values({
            companyId: newCompany.id,
            plantName: "Main Solar Facility",
            plantType: "SOLAR"
        }).returning();
        targetPlant = newPlant;
    }

    // 2. Create Protocol Config
    const protocolName = "Production IEC104 Bridge";
    let protocol = await db.query.protocolConfig.findFirst({
        where: eq(schema.protocolConfig.configName, protocolName)
    });

    const iecParams = {
        ipAddress: "178.242.103.255",
        port: 2404,
        asduAddr: 15644,
        t0: 30, t1: 15, t2: 10, t3: 20, k: 12, w: 8
    };

    if (!protocol) {
        console.log("Creating new Protocol Config...");
        const [newProto] = await db.insert(schema.protocolConfig).values({
            plantId: targetPlant.id,
            configName: protocolName,
            protocolType: 'IEC104',
            isActive: true
        }).returning();
        
        await db.insert(schema.iec104Config).values({
            protocolId: newProto.id,
            ...iecParams
        });
        protocol = newProto;
    } else {
        console.log("Updating existing Protocol Config...");
        await db.update(schema.iec104Config)
            .set(iecParams)
            .where(eq(schema.iec104Config.protocolId, protocol.id));
    }

    // 3. Create Datasheet Profile
    const profileName = "Hardware IEC104 Profile";
    let profile = await db.query.datasheetProfile.findFirst({
        where: eq(schema.datasheetProfile.name, profileName)
    });

    if (!profile) {
        console.log("Creating Datasheet Profile...");
        const [newProfile] = await db.insert(schema.datasheetProfile).values({
            name: profileName,
            protocolType: "IEC104"
        }).returning();
        profile = newProfile;
    }

    // 4. Map Discovered IOAs
    const discoveredIOAs = [
        2032000, 2032001, 2032002, 2032003, 2032004, 
        2032005, 2032006, 2032007, 2032008, 2032009, 
        2032013, 2032017, 2032021, 2032022, 2034437, 
        2034439, 2034440, 2034441, 2034442, 2034443, 
        2034444, 2034445, 2034446, 2034447, 2034448, 
        2034449, 2034450, 2034451, 2034453
    ];

    // Define professional names for the known analyzer IOAs based on discovery
    const analyzerIOAMap: Record<number, string> = {
        2034437: "L1 Gerilimi (V)",
        2034438: "L2 Gerilimi (V)",
        2034439: "L3 Gerilimi (V)",
        2034440: "L1 Akımı (A)",
        2034441: "L2 Akımı (A)",
        2034442: "L3 Akımı (A)",
        2034443: "Toplam Aktif Güç (kW)",
        2034444: "Toplam Reaktif Güç (kVAr)",
        2034445: "Toplam Görünür Güç (kVA)",
        2034446: "Güç Faktörü (cos φ)",
        2034447: "Şebeke Frekansı (Hz)",
        2034448: "Toplam Aktif Enerji (kWh)",
        2034449: "Toplam Reaktif Enerji (kVArh)",
    };

    // Mapping IOAs to Measurement Types for better DB categorization
    const analyzerMeasurementMap: Record<number, any> = {
        2034437: "PHASE_VOLTAGE",
        2034438: "PHASE_VOLTAGE",
        2034439: "PHASE_VOLTAGE",
        2034440: "PHASE_CURRENT",
        2034441: "PHASE_CURRENT",
        2034442: "PHASE_CURRENT",
        2034443: "TOTAL_ACTIVE_POWER",
        2034444: "TOTAL_REACTIVE_POWER",
        2034445: "TOTAL_APPARENT_POWER",
        2034446: "POWER_FACTOR",
        2034447: "FREQUENCY",
        2034448: "IMPORT_ACTIVE_ENERGY",
        2034449: "INDUCTIVE_REACTIVE_ENERGY",
    };

    console.log(`Setting up ${discoveredIOAs.length} points for Profile: ${profile.id}`);
    for (const ioa of discoveredIOAs) {
        const name = analyzerIOAMap[ioa] || `Analyzer Point IOA ${ioa}`;
        const unit = name.includes('(') ? name.split('(')[1].replace(')', '') : 'UNIT';
        const measurementType = analyzerMeasurementMap[ioa] || 'PHASE_VOLTAGE';

        const existing = await db.query.datasheetPoint.findFirst({
            where: (p, { and, eq }) => and(eq(p.profileId, profile.id), eq(p.dataName, name))
        });

        const values = {
            profileId: profile.id,
            dataName: name,
            dataExplanation: `${name} - Hardware Telemetry`,
            address: ioa,
            isActive: true,
            dataType: 'FLOAT32' as any,
            unit: unit,
            recordingInterval: 0,
            measurementType: measurementType as any,
        };

        if (existing) {
            await db.update(schema.datasheetPoint)
                .set(values)
                .where(eq(schema.datasheetPoint.id, existing.id));
        } else {
            await db.insert(schema.datasheetPoint).values(values);
        }
    }

    console.log('[SUCCESS] Production 104 setup completed with professional labels.');

    // 5. Create/Link Device
    const deviceName = "IEC104 Main Analyzer";
    let targetDevice = await db.query.device.findFirst({
        where: eq(schema.device.deviceName, deviceName)
    });

    if (!targetDevice) {
        console.log("Creating Device...");
        await db.insert(schema.device).values({
            deviceName: deviceName,
            deviceType: "ANALYZER",
            protocolConfigId: protocol.id,
            datasheetProfileId: profile.id,
            isActive: true,
            isRecording: true
        });
    } else {
        console.log("Updating Device configuration...");
        await db.update(schema.device)
            .set({
                protocolConfigId: protocol.id,
                datasheetProfileId: profile.id
            })
            .where(eq(schema.device.id, targetDevice.id));
    }

    console.log("✅ IEC104 Production Setup Complete!");
}

main().catch(console.error).finally(() => process.exit(0));
