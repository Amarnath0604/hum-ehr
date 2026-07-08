import { useCallback, useState } from 'react';
import PatientHospitalizationList from './PatientHospitalizationList';
import PatientHospitalizationAddEdit from './PatientHospitalizationAddEdit';
import './PatientHospitalization.css';

/**
 * Hospitalization section container. Mirrors the legacy <patient-ehr-hospitalization>
 * wrapper: it shows the list, and on Add/Edit it hides the list and shows the
 * add/edit form in its place (legacy appended the add-edit element to the wrapper
 * and hid the list). Search + Show-Deleted live here so they survive view switches.
 */
const PatientHospitalization = ({ patientId }) => {
    const [viewMode, setViewMode] = useState('LIST');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const openAddEdit = useCallback((record = null) => {
        setSelectedRecord(record);
        setViewMode('ADD_EDIT');
    }, []);
    const closeAddEdit = useCallback((shouldRefresh = false) => {
        setViewMode('LIST');
        setSelectedRecord(null);
        if (shouldRefresh)
            setRefreshKey((key) => key + 1);
    }, []);

    return (<div className="pc-patient-chart-hospitalization-wrapper" id={`patient_hospitalization_hub_${patientId}`}>
      {viewMode === 'LIST' ? (<PatientHospitalizationList patientId={patientId} searchTerm={searchTerm} onSearchChange={setSearchTerm} showDeleted={showDeleted} onShowDeletedChange={setShowDeleted} refreshKey={refreshKey} onAdd={() => openAddEdit(null)} onEdit={openAddEdit}/>) : (<PatientHospitalizationAddEdit patientId={patientId} hospitalizationRecord={selectedRecord} onClose={closeAddEdit}/>)}
    </div>);
};
export default PatientHospitalization;
