import { useEffect, useState } from 'react';
import { validateAndFetchImplantDevice, verifyImplantDeviceLater } from '../../../services/implantDeviceService';
import { useNotify } from '../../../context/NotificationContext';

/**
 * UDI entry step (legacy PatientAddImplantableDevice). Enter a UDI and "View Details"
 * runs validateAndFetch against GUDID:
 *   - success + device  → proceed to the add/edit form pre-filled from GUDID.
 *   - allowVerifyLater  → the GUDID service is down; offer "Verify Later".
 *   - otherwise         → show the backend's validation message.
 * "UDI Unknown" skips the lookup and proceeds to a manual-entry form.
 */
const PatientImplantableDeviceUDI = ({ patientId, prefillUdi = '', onProceed, onVerifiedLater, onCancel }) => {
    const [status, setStatus] = useState('Active');
    const [udi, setUdi] = useState(prefillUdi || '');
    const [udiUnknown, setUdiUnknown] = useState(false);
    const [allowVerifyLater, setAllowVerifyLater] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const { notifyError, notifySuccess } = useNotify();

    useEffect(() => { setUdi(prefillUdi || ''); }, [prefillUdi]);

    const onUdiChange = (value) => {
        setUdi(value);
        setMessage('');
        setAllowVerifyLater(false);
    };

    const onToggleUnknown = (checked) => {
        setUdiUnknown(checked);
        setMessage('');
        setAllowVerifyLater(false);
        if (checked) setUdi('');
    };

    const handleViewDetails = async () => {
        const code = (udi || '').trim();
        if (!code) { setMessage('Please enter a Unique Device Identifier'); return; }
        setBusy(true);
        setMessage('');
        try {
            const response = await validateAndFetchImplantDevice(code, patientId);
            if (response?.status === 'success' && response.data?.device) {
                onProceed({ deviceData: response.data.device, status, unknownUDI: false });
            }
            else if (response?.data?.allowVerifyLater === true) {
                setAllowVerifyLater(true);
                setMessage(response.data.message || '');
            }
            else {
                setMessage(response?.data?.message || 'Invalid UDI. Please enter a valid UDI');
            }
        }
        catch (error) {
            console.error('Failed to fetch implanted device details.', error);
            notifyError(error?.message || 'Failed to fetch implanted device details.');
        }
        finally { setBusy(false); }
    };

    const handleVerifyLater = async () => {
        setBusy(true);
        try {
            const response = await verifyImplantDeviceLater(udi, patientId);
            if (response?.status === 'success') {
                notifySuccess(response.data || 'Unsaved UDI information saved. Verify later.');
                onVerifiedLater();
            }
            else notifyError(response?.message || 'Failed to save the UDI.');
        }
        catch (error) {
            console.error('Failed to verify later.', error);
            notifyError(error?.message || 'Failed to save the UDI.');
        }
        finally { setBusy(false); }
    };

    const handleAddDetails = () => onProceed({ deviceData: null, status, unknownUDI: true });

    return (<div className="pc-patient-add-implantable-device-wrapper">
      <div className="row mx-1"><span style={{ color: '#526172', fontSize: 14 }}>Status</span></div>
      <div className="row mx-1">
        <div className="col-md-5">
          <div className="form-group">
            <select className="form-control form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
      <div className="row mx-1 mt-2"><span style={{ color: '#526172', fontSize: 14 }}>Enter the Unique Device Identifier</span></div>
      <div className="row mx-1">
        <div className="col-md-10">
          <div className="form-group">
            <input type="text" className="form-control" value={udi} disabled={udiUnknown} onChange={(e) => onUdiChange(e.target.value)}/>
            {message && <div className="small text-danger mt-1">{message}</div>}
          </div>
        </div>
      </div>
      <div className="row mx-1 mt-2">
        <span style={{ color: '#526172', fontSize: 14 }}>
          <input type="checkbox" className="form-check-input me-2" checked={udiUnknown} onChange={(e) => onToggleUnknown(e.target.checked)}/>UDI Unknown
        </span>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
        <button type="button" className="btn btn-secondary px-4 rounded-pill bs-modal-cancel-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        {!udiUnknown && !allowVerifyLater && (
          <button type="button" className="btn btn-primary px-4 rounded-pill" onClick={handleViewDetails} disabled={busy || !udi.trim()}>{busy ? 'Checking...' : 'View Details'}</button>
        )}
        {!udiUnknown && allowVerifyLater && (
          <button type="button" className="btn btn-primary px-4 rounded-pill" onClick={handleVerifyLater} disabled={busy}>Verify Later</button>
        )}
        {udiUnknown && (
          <button type="button" className="btn btn-primary px-4 rounded-pill" onClick={handleAddDetails} disabled={busy}>Add Details</button>
        )}
      </div>
    </div>);
};
export default PatientImplantableDeviceUDI;
