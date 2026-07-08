import { useState } from 'react';
import PatientMobileAccess from './PatientMobileAccess';
import PatientPreferredDayTime from './PatientPreferredDayTime';

/**
 * Others tab (legacy patient-other-details): Mobile App Access +
 * Preferred Day & Time pill sub-tabs.
 */
const PatientOtherDetails = ({ patientId }) => {
    const [subTab, setSubTab] = useState('mobile_access');
    return (<div className="p-2">
      <ul className="nav nav-pills pp-soft-nav-pill d-inline-flex" role="tablist">
        <li className="nav-item" role="presentation">
          <button type="button" className={`nav-link ${subTab === 'mobile_access' ? 'active' : ''}`} onClick={() => setSubTab('mobile_access')}>Mobile App Access</button>
        </li>
        <li className="nav-item" role="presentation">
          <button type="button" className={`nav-link ${subTab === 'preferred_date_and_time' ? 'active' : ''}`} onClick={() => setSubTab('preferred_date_and_time')}>Preferred Day &amp; Time</button>
        </li>
      </ul>
      <div className="p-1">
        {subTab === 'mobile_access' && <PatientMobileAccess patientId={patientId}/>}
        {subTab === 'preferred_date_and_time' && <PatientPreferredDayTime patientId={patientId}/>}
      </div>
    </div>);
};
export default PatientOtherDetails;
