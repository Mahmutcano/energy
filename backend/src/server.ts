import { server } from './app';
import { IEC104Service } from './services/iec104.service';

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`SCADA Backend running on port ${PORT}`);

    // Start IEC 104 Service
    const iec104Service = new IEC104Service();
    iec104Service.start();
});
