'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
//検索パラメータでURLを更新する
//useSearchParamsからフックをインポートし'next/navigation'、変数に割り当てます。
//
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
//関数が実装される頻度を制限する


export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const {replace} = useRouter();

    const handleSearch = useDebouncedCallback((term) =>{
      console.log(`Searching.....${term}`);
      const params = new URLSearchParams(searchParams);
      // console.log(term);
      params.set('page','1');
      
      //setユーザーの入力に基づいたパラメータ文字列。入力が空の場合は、次のようにしますdelete。
      if(term){
        params.set('query', term);
      }else {
      params.delete('query');
      }
      replace(`${pathname}?${params.toString()}`);
    }, 300);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        placeholder={placeholder}
        onChange = {(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={searchParams.get('query')?.toString()}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
    </div>
  );
}
