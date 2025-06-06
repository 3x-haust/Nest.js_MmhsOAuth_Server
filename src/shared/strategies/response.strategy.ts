import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class ResponseStrategy {
  success(message: string, data?: any) {
    return this.createResponse(HttpStatus.OK, message, data);
  }

  create(message: string, data?: any) {
    return this.createResponse(HttpStatus.CREATED, message, data);
  }

  update(message: string, data?: any) {
    return this.createResponse(HttpStatus.OK, message, data);
  }

  delete(message: string) {
    return this.createResponse(HttpStatus.OK, message);
  }

  conflict(message: string) {
    return this.createResponse(HttpStatus.CONFLICT, message);
  }

  error(message: string, error: any) {
    return this.createResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      null,
      error,
    );
  }

  forbidden(message: string) {
    return this.createResponse(HttpStatus.FORBIDDEN, message);
  }

  badRequest(message: string) {
    return this.createResponse(HttpStatus.BAD_REQUEST, message);
  }

  unauthorized(message: string) {
    return this.createResponse(HttpStatus.UNAUTHORIZED, message);
  }

  notFound(message: string) {
    return this.createResponse(HttpStatus.NOT_FOUND, message);
  }

  private createResponse(
    status: HttpStatus,
    message: string,
    data?: any,
    error?: any,
  ) {
    const response: any = {
      status,
      timeStamp: new Date().toISOString(),
      message,
    };

    if (data) response.data = data;
    if (error) response.error = error.message;

    return response;
  }
}
