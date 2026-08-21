import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface Envelope<T> {
  success: true;
  data: T;
  message: string;
  error: null;
}

/**
 * Wraps every successful controller return value in the standard envelope
 * (spec §36). A controller may return `{ message: "...", data: ... }` to
 * customize the message; otherwise a generic "Success" is used.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Envelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T>> {
    return next.handle().pipe(
      map((result: any) => {
        if (result && typeof result === "object" && "message" in result && "data" in result) {
          return { success: true, data: result.data, message: result.message, error: null };
        }
        return { success: true, data: result ?? null, message: "Success", error: null };
      }),
    );
  }
}
