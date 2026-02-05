import { server } from './app';
import { IEC104Service } from './services/iec104.service';
import { ModbusService } from './services/modbus.service';
import workerService from './services/worker.service';

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`SCADA Backend running on port ${PORT}`);

    // 1. Veri İşleyiciyi Başlat (Processor/Worker)
    workerService.start();

    // 2. Haberleşme Servislerini Başlat (Collectors)
    const iec104Service = new IEC104Service();
    iec104Service.start();

    const modbusService = new ModbusService();
    modbusService.start();
});
