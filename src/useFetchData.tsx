import { useState, useEffect, useRef } from 'react';

const usePrevious = <T, U = T>(state: T): T | undefined => {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = state;
  });

  return ref.current;
};

export interface RequestData<T> {
  data: T[];
  success?: boolean;
  total?: number;
}
export interface UseFetchDataAction<T extends RequestData<any>> {
  dataSource: T['data'] | T;
  loading: boolean | undefined;
  hasMore: boolean;
  current: number;
  pageSize: number;
  total: number;
  reload: () => Promise<void>;
  fetchMore: () => void;
  fullScreen?: () => void;
  resetPageIndex: () => void;
  reset: () => void;
  setPageInfo: (pageInfo: Partial<PageInfo>) => void;
}

interface PageInfo {
  hasMore: boolean;
  page: number;
  pageSize: number;
  total: number;
}

const useFetchData = <T extends RequestData<any>, U = {}>(
  getData: (params: { pageSize: number; current: number }) => Promise<T>,
  defaultData?: Partial<T['data']>,
  options?: {
    defaultCurrent?: number;
    defaultPageSize?: number;
    effects?: any[];
    onLoad?: (dataSource: T['data']) => void;
    onRequestError?: (e: Error) => void;
  },
): UseFetchDataAction<T> => {
  const {
    defaultPageSize = 20,
    defaultCurrent = 1,
    onLoad = () => null,
    onRequestError = () => null,
  } = options || {};

  const [list, setList] = useState<T['data']>(defaultData as any);
  const [loading, setLoading] = useState<boolean | undefined>(undefined);

  const [pageInfo, setPageInfo] = useState<PageInfo>({
    hasMore: false,
    page: defaultCurrent || 1,
    total: 0,
    pageSize: defaultPageSize,
  });

  // pre state
  const prePage = usePrevious(pageInfo.page);
  const prePageSize = usePrevious(pageInfo.pageSize);

  const { effects = [] } = options || {};

  /**
   * 请求数据
   * @param isAppend 是否添加数据到后面
   */
  const fetchList = async (isAppend?: boolean) => {
    if (loading) {
      return;
    }
    setLoading(true);
    const { pageSize, page } = pageInfo;

    try {
      const { data, success, total: dataTotal = 0 } =
        (await getData({
          current: page,
          pageSize,
        })) || {};
      if (success !== false) {
        if (isAppend && list) {
          setList([...list, ...data]);
        } else {
          setList(data);
        }
        // 判断是否可以继续翻页
        setPageInfo({ ...pageInfo, total: dataTotal, hasMore: dataTotal > pageSize * page });
      }
      if (onLoad) {
        onLoad(data);
      }
    } catch (e) {
      onRequestError(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMore = () => {
    // 如果没有更多的就忽略掉
    if (pageInfo.hasMore) {
      setPageInfo({ ...pageInfo, page: pageInfo.page + 1 });
    }
  };

  /**
   * pageIndex 改变的时候自动刷新
   */
  useEffect(() => {
    const { page, pageSize } = pageInfo;
    // 如果上次的页码为空或者两次页码等于是没必要查询的
    // 如果 pageSize 发生变化是需要查询的，所以又加了 prePageSize
    if ((!prePage || prePage === page) && (!prePageSize || prePageSize === pageSize)) {
      return;
    }
    // 如果 list 的长度大于 pageSize 的长度
    // 说明是一个假分页
    // (pageIndex - 1 || 1) 至少要第一页
    // 在第一页大于 10
    // 第二页也应该是大于 10
    if (page !== undefined && list.length <= pageSize) {
      fetchList();
    }
  }, [pageInfo.page]);

  // pageSize 修改后返回第一页
  useEffect(() => {
    if (!prePageSize) {
      return;
    }
    setPageInfo({ ...pageInfo, page: 1 });
    fetchList();
  }, [pageInfo.pageSize]);

  /**
   * 重置pageIndex 到 1
   */
  const resetPageIndex = () => {
    setPageInfo({ ...pageInfo, page: 1 });
  };

  useEffect(() => {
    fetchList();
  }, effects);

  return {
    dataSource: list,
    loading,
    reload: fetchList,
    fetchMore,
    total: pageInfo.total,
    hasMore: pageInfo.hasMore,
    resetPageIndex,
    current: pageInfo.page,
    reset: () => {
      setPageInfo({
        hasMore: false,
        page: defaultCurrent || 1,
        total: 0,
        pageSize: defaultPageSize,
      });
    },
    pageSize: pageInfo.pageSize,
    setPageInfo: info =>
      setPageInfo({
        ...pageInfo,
        ...info,
      }),
  };
};

export default useFetchData;
