import { Controller, Sse } from '@nestjs/common'
import { map } from 'rxjs'
import { EventsService } from '../../common/events.service'

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse()
  sse() {
    return this.events.stream().pipe(
      map((evt) => ({
        data: evt.data,
        type: evt.type,
      })),
    )
  }
}

