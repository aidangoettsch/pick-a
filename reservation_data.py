import dataclasses
import datetime

@dataclasses.dataclass
class ReservationSlot:
    time: datetime.datetime
    seating_type: str

@dataclasses.dataclass
class RestaurantResult:
    slots: list[ReservationSlot]