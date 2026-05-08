export interface Station {
  UICCode: string;
  stationType?: string;
  EVACode?: string;
  code: string;
  sporen?: Array<{ spoorNummer: string }>;
  synoniemen?: string[];
  heeftFaciliteiten?: boolean;
  heeftVertrektijden?: boolean;
  heeftReisassistentie?: boolean;
  namen: {
    lang: string;
    middel: string;
    kort: string;
  };
  land?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  naderenRadius?: number;
  distance?: number;
}

export interface Departure {
  direction: string;
  name: string;
  plannedDateTime: string;
  plannedTimeZoneOffset?: number;
  actualDateTime?: string;
  actualTimeZoneOffset?: number;
  plannedTrack?: string;
  actualTrack?: string;
  product: {
    number: string;
    categoryCode: string;
    shortCategoryName: string;
    longCategoryName: string;
    operatorCode: string;
    operatorName: string;
    type: string;
  };
  trainCategory: string;
  cancelled: boolean;
  routeStations?: Array<{
    uicCode: string;
    mediumName: string;
  }>;
  messages?: Array<{
    message: string;
    style: string;
  }>;
  departureStatus?: string;
}

export interface DeparturesResponse {
  payload: {
    source: string;
    departures: Departure[];
  };
}

export interface Arrival {
  origin: string;
  name: string;
  plannedDateTime: string;
  plannedTimeZoneOffset?: number;
  actualDateTime?: string;
  actualTimeZoneOffset?: number;
  plannedTrack?: string;
  actualTrack?: string;
  product?: {
    number?: string;
    shortCategoryName?: string;
    longCategoryName?: string;
    operatorName?: string;
  };
  trainCategory?: string;
  cancelled: boolean;
  arrivalStatus?: string;
  messages?: Array<{ message: string; style: string }>;
}

export interface ArrivalsResponse {
  payload: {
    source: string;
    arrivals: Arrival[];
  };
}

export interface Disruption {
  id: string;
  type: 'CALAMITY' | 'DISRUPTION' | 'MAINTENANCE';
  isActive: boolean;
  title: string;
  topic?: string;
  start?: string;
  end?: string;
  period?: string;
  impact?: { value: number };
  publicationSections?: Array<{
    section: {
      stations: Array<{ uicCode: string; stationCode?: string; name: string }>;
    };
  }>;
  timespans?: Array<{
    start: string;
    end?: string;
    situation?: { label: string };
    cause?: { label: string };
    advices?: string[];
  }>;
  expectedDuration?: { description: string; endTime?: string };
  phase?: { id: string; label: string };
}

export interface TripStation {
  name: string;
  stationCode?: string;
  uicCode: string;
  plannedDateTime?: string;
  actualDateTime?: string;
  plannedTrack?: string;
  actualTrack?: string;
}

export type CrowdLevel = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface TripLeg {
  name: string;
  cancelled: boolean;
  partCancelled?: boolean;
  origin: TripStation;
  destination: TripStation;
  product?: {
    displayName: string;
    shortCategoryName: string;
    operatorName: string;
    number: string;
  };
  direction?: string;
  crowdForecast?: CrowdLevel;
  shorterStock?: boolean;
  shorterStockClassification?: 'BUSY' | 'EXTRA_BUSY';
  shorterStockWarning?: string;
  crossPlatformTransfer?: boolean;
}

export interface TripFare {
  discountType?: string;
  priceInCents?: number;
  priceInCentsExcludingSupplement?: number;
  product?: string;
  travelClass?: 'FIRST_CLASS' | 'SECOND_CLASS';
  supplementInCents?: number;
  link?: string;
}

export interface TripMessage {
  id?: string;
  text?: string;
  head?: string;
  lead?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface TripPrimaryMessage {
  title?: string;
  type?: string;
  message?: TripMessage;
}

export interface Trip {
  uid: string;
  ctxRecon: string;
  plannedDurationInMinutes: number;
  actualDurationInMinutes?: number;
  transfers: number;
  status: string;
  legs: TripLeg[];
  optimal?: boolean;
  crowdForecast?: CrowdLevel;
  eco?: { co2kg: number };
  fares?: TripFare[];
  bookingUrl?: { uri?: string };
  messages?: TripMessage[];
  primaryMessage?: TripPrimaryMessage;
}

export interface TravelAdvice {
  trips: Trip[];
  source?: string;
}
