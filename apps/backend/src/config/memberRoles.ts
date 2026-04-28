export interface MemberRole {
  key: string;
  label: string;
  description: string;
}

export const MEMBER_ROLES: MemberRole[] = [
  { key: 'social_media_manager',    label: 'Social Media Manager',    description: 'Creates and publishes club posts, including X.com posts' },
  { key: 'event_host',              label: 'Event Host',              description: 'Hosts events, lectures, and workshops' },
  { key: 'workshop_facilitator',    label: 'Workshop Facilitator',    description: 'Leads hands-on workshops' },
  { key: 'lecture_coordinator',     label: 'Lecture Coordinator',     description: 'Coordinates speakers, rooms, and lecture details' },
  { key: 'content_creator',         label: 'Content Creator',         description: 'Creates posters, captions, recaps, and media assets' },
  { key: 'logistics_coordinator',   label: 'Logistics Coordinator',   description: 'Handles venue setup, materials, and on-site flow' },
  { key: 'registration_coordinator',label: 'Registration Coordinator',description: 'Manages attendee lists and check-in support' },
  { key: 'sponsorship_coordinator', label: 'Sponsorship Coordinator', description: 'Coordinates sponsors, partners, and external support' },
  { key: 'member_coordinator',      label: 'Member Coordinator',      description: 'Helps onboard and coordinate club members' },
];

export const VALID_ROLE_KEYS = new Set(MEMBER_ROLES.map((r) => r.key));
