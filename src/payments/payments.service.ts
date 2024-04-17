import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
    private readonly stripe = new Stripe(envs.stripeSecret);

    async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
        const { currency, items, orderId } = paymentSessionDto;
        const line_items = items.map((item) => {
            return {
                price_data: {
                    currency,
                    product_data: {
                        name: item.name
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity
            }
        })
        const session = await this.stripe.checkout.sessions.create({
            // Colocar id de orden
            payment_intent_data: {
                metadata: {
                    orderId
                }
            },

            line_items,
            mode: 'payment',
            success_url: envs.stripeSuccesUrl,
            cancel_url: envs.stripeCancelUrl
        });

        return session;
    }

    async stripeWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature'];
        let event: Stripe.Event;

        // TEST
        // const endpointSecret = "whsec_e9d8e77356c0d333514ea6ea410d1117eaa50fecf71e2426299bde302e5756df";
        
        //REAL
        const endpointSecret = envs.stripeEndpointSecret;
       


        try {
            event = this.stripe.webhooks.constructEvent(req['rwaBody'], sig, endpointSecret);
        } catch (error) {
            res.status(400).send(`Webhook Error: ${error.message}`);
            return;
        }
        switch (event.type) {
            case 'charge.succeeded':
                const chargeSucceeded = event.data.object;
                console.log({ metadata: chargeSucceeded.metadata })
                break;
        
            default:
                console.log(`Event ${ event.type } not handled`);
        }
        res.status(200).json({ sig });
    }
}
