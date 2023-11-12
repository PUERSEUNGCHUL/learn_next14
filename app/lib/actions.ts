'use server';
import {z} from 'zod';
import {sql} from '@vercel/postgres'
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const invoiceSchema = z.object({
    id : z.string(),
    customerId : z.string({
        invalid_type_error: '고객을 선택해주세요.'
    }),
    amount: z.coerce.number().gt(0, {
        message: '가격은 $0보다 많아야합니다.'
    }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: '청구구분을 선택해주세요.'
    }),
    date: z.string()
})


const CreateInvoice = invoiceSchema.omit({
    id: true,
    date: true
})

export type State = {
    errors?: {
        customerId?: string[],
        amount?: string[],
        status?: string[]
    };
    message?: string | null;
}

export const createInvoice =async (prevState: State, formData:FormData) => {

    const rawFormData = Object.fromEntries(formData.entries())
    const validatedFields  = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice'
        }
    }
    

    const amountInCents = validatedFields.data.amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {

        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${validatedFields.data.customerId}, ${amountInCents}, ${validatedFields.data.status}, ${date})
        `
    } catch {
        return {
            message: "Database Error: Failed to Create Invoice."
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

    console.log(rawFormData)
    
}

const UpdateInvoice = invoiceSchema.omit({ date: true, id: true });

export const updateInvoice = async (id: string,
    prevState: State,
    formData: FormData,) => {

    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status")

    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Invoice."
        }
    }
    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 1000;

    try {
        
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch {
        return {
            message: "Database Error: Failed to Update Invoice."
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

export const deleteInvoice =async (id:string) => {

    
    throw new Error('Failed to Delete Invoice');
    try {

        await sql `
            DELETE FROM invoices
            WHERE id = ${id}
        `
    } catch {
        return {
            message: "Database Error: Failed to Delete Invoice."
        }
    }
    revalidatePath('/dashboard/invoices');
    
}