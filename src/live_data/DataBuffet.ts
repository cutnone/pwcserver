import { Response } from "express";
import DataRecipeBook from "./DataRecipeBook.js";
import DataPatron from "./DataPatron.js";

export type DataBin = {
    customers: DataPatron[];
    value: any,
}

/**
 * The Data Buffet contains all current data orders in bins, grouped by the menu item.
 */
export default class DataBuffet {

    static dataBins: Map<string, DataBin> = new Map();

    public static async placeOrder(customer: DataPatron, item: string) {

        const bin = this.dataBins.get(item);
        
        if (bin) {
            // if (!bin.customers.includes(customer)) {
            //     bin.customers.push(customer);
            // }
            bin.customers.push(customer);
            customer.pushData(item, bin.value)
        } else {
            const FIRST_MEAL = await DataRecipeBook.cook(item);
            
            if (FIRST_MEAL !== undefined) {
                this.dataBins.set(item, {
                    value: FIRST_MEAL,
                    customers: [customer],
                });
                customer.pushData(item, FIRST_MEAL)
                
            }
        }
    }
    
    public static placeOrders(customer: DataPatron, ...items: string[]) {

        for (const I of items) {
            this.placeOrder(customer, I)
        }

    }

    public static abduct(customer: DataPatron) {

        for (const D of this.dataBins) {
            const BIN = D[1];
            if (BIN.customers.includes(customer)) {
                BIN.customers.splice(BIN.customers.indexOf(customer), 1)
            }
        }

    }

}