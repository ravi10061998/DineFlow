import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { BusinessException } from "../exceptions/business.exception";

/**
 * Converts every thrown error into the response envelope defined in spec §36:
 * { success, data, message, error }.
 * Never leaks internal error details (stack traces, DB errors) to the client —
 * only BusinessException-derived, intentional errors get a specific `code`.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Something went wrong. Please try again later.";
    let code = "INTERNAL_SERVER_ERROR";
    let details: unknown = undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const r = res as Record<string, unknown>;
        message = Array.isArray(r.message) ? (r.message as string[]).join(", ") : ((r.message as string) ?? message);
        details = Array.isArray(r.message) ? r.message : undefined;
      }
      code = HttpStatus[status] ?? "HTTP_ERROR";
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception, undefined, request.url);
    }

    response.status(status).json({
      success: false,
      data: null,
      message,
      error: { code, details },
    });
  }
}
