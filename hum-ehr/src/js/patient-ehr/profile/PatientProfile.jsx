import { useState } from 'react';
import PatientProfileDemographics from './PatientProfileDemographics';
import PatientContactInformation from './PatientContactInformation';
import PatientHealthInsurance from '../health-insurance/PatientHealthInsurance';
import PatientCareTeam from './PatientCareTeam';
import PatientCareGivers from './PatientCareGivers';
import PatientDeactivation from './PatientDeactivation';
import PatientOtherDetails from './PatientOtherDetails';
import './PatientProfile.css';

const TABS = [
    { key: 'demographics', label: 'Demographics' },
    { key: 'contact_information', label: 'Contact Information' },
    { key: 'health_insurance', label: 'Health Insurance' },
    { key: 'care_team_status', label: 'Care Team' },
    { key: 'care_givers', label: 'Care Givers' },
    { key: 'patient_deactivation', label: 'Patient Deactivation' },
    { key: 'others', label: 'Others' },
];

/**
 * Patient Profile (legacy patient-chart-patient-profile): top-level pill tabs.
 * Like the legacy container, a tab's content mounts on first activation and
 * stays mounted afterwards.
 */
const PatientProfile = ({ patientId }) => {
    const [activeTab, setActiveTab] = useState('demographics');
    const [mountedTabs, setMountedTabs] = useState(() => new Set(['demographics']));

    const selectTab = (key) => {
        setActiveTab(key);
        setMountedTabs((prev) => {
            if (prev.has(key)) return prev;
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    };

    const renderTab = (key) => {
        switch (key) {
            case 'demographics': return <PatientProfileDemographics patientId={patientId}/>;
            case 'contact_information': return <PatientContactInformation patientId={patientId}/>;
            case 'health_insurance': return <PatientHealthInsurance patientId={patientId}/>;
            case 'care_team_status': return <PatientCareTeam patientId={patientId}/>;
            case 'care_givers': return <PatientCareGivers patientId={patientId}/>;
            case 'patient_deactivation': return <PatientDeactivation patientId={patientId}/>;
            case 'others': return <PatientOtherDetails patientId={patientId}/>;
            default: return null;
        }
    };

    return (<div className="patient-profile-node" id={`patient_profile_${patientId}`}>
      <div className="patient-profile-toggle-group mt-1">
        <ul className="nav nav-pills flex-nowrap overflow-auto" role="tablist">
          {TABS.map((tab) => (
            <li className="nav-item" role="presentation" key={tab.key}>
              <button type="button" role="tab" aria-selected={activeTab === tab.key}
                className={`nav-link text-nowrap ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => selectTab(tab.key)}>{tab.label}</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="patient-demographics-container">
        <div className="tab-content">
          {TABS.filter((tab) => mountedTabs.has(tab.key)).map((tab) => (
            <div key={tab.key} className={`tab-pane fade ${activeTab === tab.key ? 'show active' : ''}`} role="tabpanel">
              {renderTab(tab.key)}
            </div>
          ))}
        </div>
      </div>
    </div>);
};
export default PatientProfile;
