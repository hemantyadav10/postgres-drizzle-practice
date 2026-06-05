interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

class ApiResponse<T> {
  public readonly success = true;

  private constructor(
    public readonly data: T,
    public readonly message: string,
    public readonly meta?: PaginationMeta,
  ) {}

  static ok<T>(data: T, message: string = "Success") {
    return new ApiResponse<T>(data, message);
  }

  static created<T>(data: T, message: string = "Created") {
    return new ApiResponse<T>(data, message);
  }

  static paginated<T>({
    data,
    meta,
    message = "Success",
  }: {
    data: T;
    meta: PaginationMeta;
    message?: string;
  }) {
    return new ApiResponse<T>(data, message, meta);
  }
}

export { ApiResponse };
