import { useState } from 'react';
import PatientPhoneInformation from './PatientPhoneInformation';
import PatientAddressInformation from './PatientAddressInformation';

/**
 * Contact Information tab (legacy patient-contact-information): Communication
 * Information / Residential Information pill sub-tabs. The pill bar hides
 * while the phone edit form is open (legacy behavior).
 */
const PatientContactInformation = ({ patientId }) => {
    const [subTab, setSubTab] = useState('phone_information');
    const [phoneEditing, setPhoneEditing] = useState(false);

    return (<div className="p-2">
      {!phoneEditing && (
        <ul className="nav nav-pills pp-soft-nav-pill d-inline-flex" role="tablist">
          <li className="nav-item" role="presentation">
            <button type="button" className={`nav-link ${subTab === 'phone_information' ? 'active' : ''}`} onClick={() => setSubTab('phone_information')}>Communication Information</button>
          </li>
          <li className="nav-item" role="presentation">
            <button type="button" className={`nav-link ${subTab === 'address_information' ? 'active' : ''}`} onClick={() => setSubTab('address_information')}>Residential Information</button>
          </li>
        </ul>
      )}
      <div className="p-1">
        {subTab === 'phone_information' && <PatientPhoneInformation patientId={patientId} onEditingChange={setPhoneEditing}/>}
        {subTab === 'address_information' && <PatientAddressInformation patientId={patientId}/>}
      </div>
    </div>);
};
export default PatientContactInformation;
