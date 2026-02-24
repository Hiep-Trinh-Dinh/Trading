import { Injectable } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'

export type TradingEvent =
  | { type: 'snapshot'; data: unknown }
  | { type: 'order_created'; data: unknown }
  | { type: 'position_created'; data: unknown }
  | { type: 'position_updated'; data: unknown }
  | { type: 'position_closed'; data: unknown }
  | { type: 'wallet_updated'; data: unknown }
  | { type: 'price_updated'; data: unknown }

@Injectable()
export class EventsService {
  private readonly subject = new Subject<TradingEvent>()

  emit(evt: TradingEvent) {
    this.subject.next(evt)
  }

  stream(): Observable<TradingEvent> {
    return this.subject.asObservable()
  }
}

