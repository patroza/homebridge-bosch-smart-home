import type {
  Service,
  PlatformAccessory,
  // CharacteristicValue,
  // CharacteristicSetCallback,
  // CharacteristicGetCallback,
} from "homebridge";

import { type BoschPlatform, PlugBase } from "./platform";
import { BoschSmartHomeBridge } from "bosch-smart-home-bridge";
import FakegatoHistory from "fakegato-history";
import $ from "rxjs";


function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Accessory {
  private service: Service;

  private historyService: Service & { addEntry: any };

  private states = {
    powerConsumption: 0.0,
    totalConsumption: 0.0,
  };

  constructor(
    private readonly platform: BoschPlatform,
    private readonly accessory: PlatformAccessory<{ device: PlugBase }>,
    private readonly bshb: BoschSmartHomeBridge,
  ) {
    const FakeGatoHistoryService = FakegatoHistory(this.platform.api);

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Bosch")
      .setCharacteristic(this.platform.Characteristic.Model, "Energy Meter")
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        accessory.context.device.serial,
      );


    this.service = this.accessory.getService(this.platform.CustomServices.Outlet) ||
        this.accessory.addService(this.platform.CustomServices.Outlet);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    this.service
      .setCharacteristic(this.platform.api.hap.Characteristic.InUse, 1); // TODO
    this.service
      .setCharacteristic(this.platform.api.hap.Characteristic.On, 1); // I think?

    this.service
      .getCharacteristic(this.platform.CustomCharacteristics.Consumption)
      .on("get", (callback) => callback(null, this.states.powerConsumption));
    this.service
      .getCharacteristic(this.platform.CustomCharacteristics.TotalConsumption)
      .on("get", (callback) => callback(null, this.states.totalConsumption));
    this.service
      .getCharacteristic(this.platform.CustomCharacteristics.Voltage)
      .on("get", (callback) => callback(null, 232));
    this.service
      .getCharacteristic(this.platform.CustomCharacteristics.ElectricCurrent)
      .on("get", (callback) => callback(null, 1));
    this.historyService = new FakeGatoHistoryService("energy", this.accessory, { storage:"fs" });

    // template:
    // this.service =
    //   this.accessory.getService(this.platform.Service.Lightbulb) ||
    //   this.accessory.addService(this.platform.Service.Lightbulb);
    // this.service.setCharacteristic(
    //   this.platform.Characteristic.Name,
    //   accessory.context.device.DisplayName
    // );

    // this.service
    //   .getCharacteristic(this.platform.Characteristic.On)
    //   .on("set", this.setOn.bind(this))
    //   .on("get", this.getOn.bind(this));

    // this.service
    //   .getCharacteristic(this.platform.Characteristic.Brightness)
    //   .on("set", this.setBrightness.bind(this));

    // const motionSensorOneService =
    //   this.accessory.getService("Motion Sensor One Name") ||
    //   this.accessory.addService(
    //     this.platform.Service.MotionSensor,
    //     "Motion Sensor One Name",
    //     "YourUniqueIdentifier-1"
    //   );
    // const motionSensorTwoService =
    //   this.accessory.getService("Motion Sensor Two Name") ||
    //   this.accessory.addService(
    //     this.platform.Service.MotionSensor,
    //     "Motion Sensor Two Name",
    //     "YourUniqueIdentifier-2"
    //   );

    // let motionDetected = false;

    // TODO: clear on destruction?

    // will receive 503 when trying to retrieve PowerMeter of device that is currently not plugged in it seems..
    $.timer(0, 1500 + randomInteger(100, 1000))
      .pipe($.switchMap(() =>
        bshb
          .getBshcClient()
          .getDeviceServices(this.accessory.context.device.id, "PowerMeter")))
      .subscribe({ next: (response) => {
        const allPowerMeters = [response.parsedResponse].flat().filter(
          (_) => _.state && _.state["@type"] === "powerMeterState",
        );
        const powerConsumption = Math.abs(
          parseFloat(allPowerMeters[0].state.powerConsumption),
        );
        const totalPowerConsumption = Math.abs(
          parseFloat(allPowerMeters[0].state.energyConsumption) / 1000,
        );
        this.platform.log.debug(`PowerMeter for ${this.accessory.context.device.name}`, { powerConsumption, totalPowerConsumption, state: response.parsedResponse  });
        this.states.powerConsumption = powerConsumption;
        this.states.totalConsumption = totalPowerConsumption;
        if (powerConsumption != null) {
          this.service
            .updateCharacteristic(platform.CustomCharacteristics.Consumption, powerConsumption);
            
          this.historyService.addEntry({ time: Math.round(new Date().valueOf() / 1000), power: powerConsumption });
        }
        //FakeGato
        // this.historyService.addEntry({time: Math.round(new Date().valueOf() / 1000), power: powerConsumption});}
        if (totalPowerConsumption != null) {
          this.service
            .updateCharacteristic(platform.CustomCharacteristics.TotalConsumption, totalPowerConsumption);
        }
      }, error: (error) => this.platform.log.error("Error fetching device services", error), complete: () => this.platform.log.debug("Fetch device services complete") });
  }
}

