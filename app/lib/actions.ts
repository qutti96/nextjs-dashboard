'use server';
//ファイル内のすべてのエクスポートされた関数をサーバー関数としてマークします。これらのサーバー関数は、クライアント コンポーネントとサーバー コンポーネントにインポートできるため、非常に多用途に使用できます

import { z } from 'zod';
import { sql } from '@vercel/postgres';

//Next.js には、ルートセグメントをユーザーのブラウザに一定期間保存するクライアント側ルーターキャッシュがあります。プリフェッチと併せて、このキャッシュにより、サーバーへのリクエスト数を減らしながら、ユーザーがルート間をすばやく移動できるようになります。
//請求書ルートに表示されるデータを更新するため、このキャッシュをクリアしてサーバーへの新しいリクエストをトリガーする必要があります。これは、revalidatePathNext.js の関数を使用して実行できます。
import { revalidatePath } from 'next/cache';

// ゆーさーをページにリダイレクトする
import { redirect } from 'next/navigation';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}




const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
  .number()
  .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData){
  //rawFormData型を渡してCreateInvoiceを検証
// Validate form fields using Zod
const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

   // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  //データベースに通貨値をセント単位で保存する
  const amountInCents = amount * 100;
  //請求書の作成日として「YYYY-MM-DD」形式の新しい日付を作成
  const date = new Date().toISOString().split('T')[0];

  //ヒント:多くのフィールドを持つフォームで作業している場合は、entries()JavaScriptのObject.fromEntries()。
  // const rawFormData = Object.fromEntries(formData.entries())
  //test it  out:
  // console.log(rawFormData);
  // console.log(typeof rawFormData.amount);

  try{
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch(error){
    return{
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  //データベースが更新されると、/dashboard/invoicesパスが再検証され、サーバーから最新のデータが取得される
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');

}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }


  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try{
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch(error){
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string){
  throw new Error('Failed to Delete Invoice');
  //Unreachable code block

  try{
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return{message: 'Deleted Invoice'};
  } catch(error){
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}