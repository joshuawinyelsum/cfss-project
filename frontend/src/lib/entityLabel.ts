export function getEntityLabel(surveyType: string) {
  switch (surveyType?.toUpperCase()) {
    case 'HOUSEHOLD': return 'House Number';
    case 'EDUCATION': return 'School ID';
    case 'HEALTH': return 'Health Facility ID';
    case 'GOVERNANCE': return 'Governance Entity ID';
    default: return 'Entity ID';
  }
}

