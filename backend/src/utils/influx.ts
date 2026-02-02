// Mocking InfluxDB for the demo
export const saveTelemetry = (deviceId: string, ioa: number, value: number, customerId: string) => {
    // console.log(`Telemetry [${deviceId}] IOA ${ioa}: ${value}`);
    // In a real scenario, this would write to InfluxDB
};

export const queryTelemetry = async () => {
    return [];
};
