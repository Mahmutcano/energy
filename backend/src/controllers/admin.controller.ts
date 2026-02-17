import { Request, Response } from 'express';
import modbusService from '../services/modbus.service';

export const testModbus = async (req: Request, res: Response) => {
    try {
        const { ip, port, slaveId, address, functionCode } = req.body;

        // Note: For now we only support Reading Holding Registers (03)
        if (functionCode !== '03' && functionCode !== 3) {
            return res.status(400).json({ message: 'Şu an sadece "03 - Read Holding Registers" desteklenmektedir.' });
        }

        const result = await modbusService.testModbusConnection({
            ip,
            port: Number(port),
            slaveId: Number(slaveId),
            address: Number(address),
            quantity: 1
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message,
            code: err.code
        });
    }
};
