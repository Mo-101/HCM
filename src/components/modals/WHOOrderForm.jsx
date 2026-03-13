/**
 * WHOOrderForm.jsx
 * ─────────────────────────────────────────────────────────────────────
 * Exact digital replica of the WHO AFRO Emergency Order Request (OR) form.
 * Dynamic — auto-populated from order data passed as props.
 * Printable — triggers browser print with form-only layout.
 *
 * MoStar Industries · WHO AFRO OSL
 * ─────────────────────────────────────────────────────────────────────
 */

import { useRef, useState } from 'react';

const HUB_ADDRESSES = {
  Nairobi: {
    org:      'World Health Organization',
    line1:    'Office of the WHO Representative in Country_Name',
    line2:    '82 – 86 Shockroom Road',
    line3:    'Cnr. Enterprise & Glenara Roads',
    line4:    'Mainland',
    line5:    'Nairobi',
  },
  Dakar: {
    org:      'World Health Organization',
    line1:    'Office of the WHO Representative in Country_Name',
    line2:    'Route des Almadies',
    line3:    'BP 2484, Dakar',
    line4:    'Sénégal',
    line5:    'Dakar',
  },
};

const NOTIFY_EMAILS = [
  'nizeyi.manag@who.int; afrosIsupply@who.int; wainanal@who.int',
  '; afnbohubship@who.int; abdulatipovah@who.int; bayonneg@who.int;',
  'tindji@who.int; serram@who.int; tafida@who.int; mendizabalc@who.int',
];

const OPERATION_TYPES = [
  'Response Operations',
  'Cholera',
  'Ebola / MVD',
  'Mpox',
  'Lassa Fever',
  'Marburg',
  'Malaria',
  'Routine Supply',
];

function EditableCell({ field, defaultValue = '', style = {}, editMode, editableFields, setEditableFields }) {
  if (!editMode) {
    return <span style={style}>{editableFields[field] || defaultValue}</span>;
  }
  return (
    <input
      type="text"
      className="editable-input"
      value={editableFields[field] !== undefined ? editableFields[field] : defaultValue}
      onChange={(e) => setEditableFields({ ...editableFields, [field]: e.target.value })}
      style={{
        width: '100%',
        border: 'none',
        background: '#FFF9C4',
        padding: '2px 4px',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        ...style
      }}
    />
  );
}

export default function WHOOrderForm({ order, currentUser, onClose }) {
  const printRef = useRef();
  const [editMode, setEditMode] = useState(false);
  const [editableFields, setEditableFields] = useState({});

  if (!order) return null;

  const hub        = order.fulfillment_warehouse_code || 'Nairobi';
  const hubAddr    = HUB_ADDRESSES[hub] || HUB_ADDRESSES.Nairobi;
  const refCountry = order.country || order.delivery_country || 'Country';
  const refNum     = order.order_number || `OR_${new Date().getFullYear().toString().slice(2)}-001`;
  const pteaoVal   = order.pateo_ref || order.pateoRef || '';
  const nbLines    = order.items?.length || 0;
  const estGoodsCost = order.items?.reduce((s, i) => {
    const price = parseFloat(i.commodity?.price || i.unit_price || 0);
    const qty   = parseInt(i.quantity || 1);
    return s + (price * qty);
  }, 0) || 0;
  const shippingCost   = parseFloat(editableFields.shipping_cost || order.shipping_cost || 0);
  const estTotalCost   = estGoodsCost + shippingCost;
  const shipMethod     = editableFields.ship_method || order.preferred_shipping_method || order.preferredShippingMethod || '';
  const requesterRef   = currentUser?.name || order.requested_by || '';
  const opType         = order.intervention_type || order.interventionType || '';
  const remarks        = editableFields.remarks || order.notes || '';
  const today          = new Date().toLocaleDateString('en-GB');

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>WHO OR Form - ${refNum}_${refCountry}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; background: #fff; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
            .no-border td, .no-border th { border: none; }
            @page { size: A4 landscape; margin: 8mm; }
            .editable-input { border: none !important; background: transparent !important; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const lineItems = order.items || [];
  const minRows   = Math.max(lineItems.length, 8);
  const fillerRows = Array(Math.max(0, minRows - lineItems.length)).fill(null);

  return (
    <>
      <style>{`
        @media print {
          body > *:not(.who-or-print-root) { display: none !important; }
          .who-or-print-root { position: fixed; inset: 0; z-index: 99999; }
        }
        .who-or-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 9000;
          display: flex; align-items: flex-start; justify-content: center;
          overflow-y: auto; padding: 20px;
        }
        .who-or-modal {
          background: #fff;
          width: 100%; max-width: 1100px;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,.5);
        }
        .who-or-toolbar {
          background: #1A2B4A;
          color: #fff;
          padding: 10px 16px;
          display: flex; align-items: center; gap: 12px;
          font-family: Arial, sans-serif;
          font-size: 13px;
        }
        .who-or-toolbar-title { flex: 1; font-weight: 600; }
        .who-or-btn {
          padding: 7px 18px;
          border: none; border-radius: 4px;
          cursor: pointer; font-size: 12px; font-weight: 600;
          transition: opacity .2s;
        }
        .who-or-btn:hover { opacity: .85; }
        .who-or-print-root {
          padding: 12px;
          background: #fff;
          font-family: Arial, sans-serif;
          font-size: 8.5pt;
          color: #000;
        }

        .or-table {
          width: 100%; border-collapse: collapse;
          table-layout: fixed;
        }
        .or-table td, .or-table th {
          border: 1px solid #555;
          padding: 3px 5px;
          vertical-align: top;
          font-size: 8pt;
          line-height: 1.35;
        }
        .or-table .no-border { border: none; }

        .or-header-logo td { border: 1px solid #555; padding: 3px 6px; vertical-align: middle; }
        .who-logo-cell { width: 130px; }
        .or-emergency {
          font-size: 20pt; font-weight: 900; color: #cc0000;
          text-align: center; letter-spacing: 1px;
        }
        .or-ref-cell {
          background: #FFD700; font-size: 14pt; font-weight: 900;
          text-align: right; white-space: nowrap;
          padding: 4px 10px !important;
        }
        .or-ref-label { color: #cc0000; }
        .or-ref-value { color: #000; }

        .cell-label {
          font-weight: 700; font-size: 7.5pt;
          color: #000; white-space: nowrap;
        }
        .cell-value {
          font-size: 7.5pt; color: #000;
        }
        .cell-value.red { color: #cc0000; font-style: italic; }
        .cell-value.blue { color: #0070c0; }

        .r-label {
          text-align: right; font-weight: 700; font-size: 7.5pt;
          border-right: none !important; white-space: nowrap; color: #000;
        }
        .r-value {
          border-left: 1px solid #555 !important;
          font-size: 7.5pt; color: #000;
          min-width: 100px;
        }
        .r-value.yellow-bg { background: #FFF9C4; }
        .r-value.blue-bg   { background: #DBEAFE; }

        .op-btn {
          display: inline-block;
          background: #009ADE;
          color: #fff;
          font-weight: 700;
          font-size: 8pt;
          padding: 4px 12px;
          margin-right: 3px;
          border: 1px solid #0077B6;
          cursor: default;
          white-space: nowrap;
        }
        .op-btn.active { background: #0077B6; }
        .op-other {
          display: inline-block;
          font-style: italic; font-size: 7.5pt; color: #666;
          border: 1px dashed #aaa; padding: 4px 10px;
        }

        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th {
          background: #1A2B4A; color: #fff;
          font-size: 7pt; font-weight: 700;
          border: 1px solid #555; padding: 4px 5px;
          text-align: center;
        }
        .items-table td {
          border: 1px solid #bbb;
          padding: 3px 5px; font-size: 7.5pt;
          height: 18px;
        }
        .items-table tr:nth-child(even) td { background: #f9f9f9; }
        .items-table .col-num   { width: 28px; text-align: center; }
        .items-table .col-code  { width: 90px; }
        .items-table .col-desc  { /* flexible */ }
        .items-table .col-unit  { width: 72px; text-align: center; }
        .items-table .col-qty   { width: 55px; text-align: center; }
        .items-table .col-price { width: 90px; text-align: right; color: #cc0000; }
        .items-table .col-total { width: 90px; text-align: right; font-weight: 600; }
        .items-table .col-rem   { width: 100px; }

        .sig-table { width: 100%; border-collapse: collapse; margin-top: 0; }
        .sig-table td {
          border: 1px solid #555; padding: 20px 10px 6px;
          text-align: center; font-size: 7.5pt;
          color: #cc8800; font-style: italic; font-weight: 600;
          width: 33%;
        }

        .editable-input {
          width: 100%;
          border: none;
          background: #FFF9C4;
          padding: 2px 4px;
          font-size: inherit;
          font-family: inherit;
        }
      `}</style>

      <div className="who-or-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="who-or-modal">

          <div className="who-or-toolbar">
            <span className="who-or-toolbar-title">
              📋 WHO Emergency Order Request — REF: {refNum}_{refCountry}
            </span>
            <button
              className="who-or-btn"
              style={{ background: editMode ? '#F59E0B' : '#6B7280', color: '#fff' }}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? '🔒 Lock' : '✏️ Edit'}
            </button>
            <button
              className="who-or-btn"
              style={{ background: '#009ADE', color: '#fff' }}
              onClick={handlePrint}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              className="who-or-btn"
              style={{ background: '#374151', color: '#fff' }}
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>

          <div className="who-or-print-root" ref={printRef}>

            <table className="or-table" style={{ marginBottom: 0 }}>
              <colgroup>
                <col style={{ width: '130px' }} />
                <col />
                <col style={{ width: '350px' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td rowSpan={1} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px', background: '#fff' }}>
                    <img
                      src="/images/who-afro-logo.png"
                      alt="WHO"
                      style={{ height: '52px', objectFit: 'contain' }}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none', fontWeight: 900, fontSize: '13pt', color: '#009ADE' }}>
                      WHO
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #555' }}>
                    <span className="or-emergency">Emergency</span>
                  </td>
                  <td className="or-ref-cell" style={{ verticalAlign: 'middle' }}>
                    <span className="or-ref-label">REF : </span>
                    <span className="or-ref-value">{refNum}_{refCountry}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="or-table" style={{ marginTop: '-1px' }}>
              <colgroup>
                <col style={{ width: '110px' }} />
                <col style={{ width: '300px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '140px' }} />
              </colgroup>
              <tbody>

                <tr>
                  <td className="cell-label" style={{ background: '#FFD700' }}>From (initiator) :</td>
                  <td className="cell-label" style={{ background: '#f0f0f0' }}>Consignee address:</td>
                  <td className="r-label">Mode of shipment :</td>
                  <td className="r-value">
                    <EditableCell field="ship_method" defaultValue={shipMethod} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="r-label">PTEAO :</td>
                  <td className="r-value red" style={{ color: '#cc0000', fontStyle: 'italic' }}>
                    <EditableCell field="pteao" defaultValue={pteaoVal || 'CF75D0000000 – 00.0 – 00000'} style={{ color: '#cc0000', fontStyle: 'italic' }} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>

                <tr>
                  <td rowSpan={5} className="cell-value" style={{ verticalAlign: 'top', paddingTop: 4 }}>
                    {currentUser?.country || refCountry} Country Office
                  </td>
                  <td rowSpan={5} className="cell-value red" style={{ verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 700, color: '#000', fontStyle: 'normal' }}>{hubAddr.org}</div>
                    <div>{hubAddr.line1}</div>
                    <div>{hubAddr.line2}</div>
                    <div>{hubAddr.line3}</div>
                    <div>{hubAddr.line4}</div>
                    <div>{hubAddr.line5}</div>
                  </td>
                  <td className="r-label">Nb of lines:</td>
                  <td className="r-value">{nbLines}</td>
                  <td className="r-label">Estimated total cost :</td>
                  <td className="r-value blue-bg">${estTotalCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="r-label">Estimated goods cost :</td>
                  <td className="r-value">${estGoodsCost.toFixed(2)}</td>
                  <td className="r-label">Requester ref :</td>
                  <td className="r-value">{requesterRef}</td>
                </tr>
                <tr>
                  <td className="r-label">Requested ready on :</td>
                  <td className="r-value">
                    <EditableCell field="requested_ready_on" defaultValue={order.requested_ready_on || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="r-label">Conf. ready date:</td>
                  <td className="r-value">
                    <EditableCell field="confirmed_ready_date" defaultValue={order.confirmed_ready_date || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>
                <tr>
                  <td className="r-label" style={{ background: '#f0f0f0' }}></td>
                  <td className="r-value" style={{ background: '#f0f0f0' }}></td>
                  <td className="r-label" style={{ background: '#f0f0f0' }}></td>
                  <td className="r-value" style={{ background: '#f0f0f0' }}></td>
                </tr>
                <tr>
                  <td className="r-label" style={{ background: '#f0f0f0' }}></td>
                  <td className="r-value" style={{ background: '#f0f0f0' }}></td>
                  <td className="r-label" style={{ background: '#f0f0f0' }}></td>
                  <td className="r-value" style={{ background: '#f0f0f0' }}></td>
                </tr>

                <tr>
                  <td className="cell-label" style={{ background: '#f0f0f0', verticalAlign: 'top' }}>To (processing unit):</td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div className="cell-label" style={{ marginBottom: 2 }}>Notify party:</div>
                    {NOTIFY_EMAILS.map((e, i) => (
                      <div key={i} className="cell-value blue" style={{ fontSize: '7pt', lineHeight: 1.4 }}>{e}</div>
                    ))}
                  </td>
                  <td className="r-label">Estimated weight (kg) :</td>
                  <td className="r-value">
                    <EditableCell field="shipping_weight_kg" defaultValue={order.shipping_weight_kg || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="r-label">Confirmed weight :</td>
                  <td className="r-value">
                    <EditableCell field="confirmed_weight" defaultValue={order.confirmed_weight || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>
                <tr>
                  <td className="cell-value" style={{ verticalAlign: 'top' }}></td>
                  <td style={{ verticalAlign: 'top' }}></td>
                  <td className="r-label">Estimated Volume (cbm):</td>
                  <td className="r-value">
                    <EditableCell field="shipping_volume_cbm" defaultValue={order.shipping_volume_cbm || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="r-label">Confirmed volume :</td>
                  <td className="r-value">
                    <EditableCell field="confirmed_volume" defaultValue={order.confirmed_volume || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>
                <tr>
                  <td className="cell-label" style={{ background: '#f0f0f0' }}>Shipping dimensions:</td>
                  <td></td>
                  <td className="r-label">Estimated nb parcels:</td>
                  <td className="r-value">
                    <EditableCell field="shipping_packages" defaultValue={order.shipping_packages || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="r-label">Nb parcels :</td>
                  <td className="r-value">
                    <EditableCell field="confirmed_parcels" defaultValue={order.confirmed_parcels || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td className="r-label">Estimated ship cost :</td>
                  <td className="r-value">
                    <EditableCell field="shipping_cost" defaultValue={shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="r-label">Nb boxes :</td>
                  <td className="r-value">
                    <EditableCell field="confirmed_boxes" defaultValue={order.confirmed_boxes || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>

                <tr>
                  <td className="cell-label" style={{ background: '#f0f0f0' }}>Freight charges payable:</td>
                  <td colSpan={3}>
                    <EditableCell field="freight_charges_payable" defaultValue={order.freight_charges_payable || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                  <td className="cell-label" style={{ background: '#f0f0f0' }}>Shipping documents required:</td>
                  <td>
                    <EditableCell field="shipping_documents_required" defaultValue={order.shipping_documents_required || ''} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>

                <tr>
                  <td colSpan={6} style={{ padding: '5px 6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                      <div style={{
                        fontSize: '6.5pt', color: '#cc0000', fontStyle: 'italic',
                        maxWidth: '260px', marginRight: '12px', lineHeight: 1.3
                      }}>
                        Example - This order is for Venus space station stock replenishment replacing Cholera kits,cholera beds,Tents,Cholera investigation
                        kits shipped from Kenya emergency hub/Kenya to Venus Space Station. (Ref: OR_24-000, NBO hub, Venus_Space_Station)
                      </div>

                      {OPERATION_TYPES.map((type, i) => {
                        const isActive = opType?.toLowerCase().includes(type.toLowerCase()) ||
                          (i === 0 && !opType);
                        return (
                          <span key={type} className={`op-btn ${isActive ? 'active' : ''}`}>
                            {type}
                          </span>
                        );
                      })}
                      <span className="op-other">If Other (Please Specify):</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="cell-label" style={{ background: '#f0f0f0', whiteSpace: 'nowrap' }}>Remarks:</td>
                  <td colSpan={5} className="cell-value" style={{ minHeight: 24 }}>
                    <EditableCell field="remarks" defaultValue={remarks} editMode={editMode} editableFields={editableFields} setEditableFields={setEditableFields} />
                  </td>
                </tr>

              </tbody>
            </table>

            <table className="items-table" style={{ marginTop: '-1px' }}>
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th className="col-code">WHO code</th>
                  <th className="col-desc">WHO Description</th>
                  <th className="col-unit">Unit of Measure</th>
                  <th className="col-qty">Quantity</th>
                  <th className="col-price">Unit price USD<br/><span style={{ fontWeight: 400, fontSize: '6pt', color: '#ffcc88' }}>(if available)</span></th>
                  <th className="col-total">TOTAL AMOUNT ($)</th>
                  <th className="col-rem">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const price   = parseFloat(item.commodity?.price || item.unit_price || 0);
                  const qty     = parseInt(item.quantity || 1);
                  const total   = price * qty;
                  const whoCode = item.commodity?.who_code || item.commodity?.code || item.who_code || `WHO-${String(item.commodity?.id || idx + 1).padStart(4, '0')}`;
                  const name    = item.commodity?.name || item.name || '';
                  const unit    = item.commodity?.unit || item.unit || '';
                  return (
                    <tr key={item.id || idx}>
                      <td className="col-num">{idx + 1}</td>
                      <td className="col-code" style={{ fontFamily: 'monospace', fontSize: '7pt' }}>{whoCode}</td>
                      <td className="col-desc">{name}</td>
                      <td className="col-unit">{unit}</td>
                      <td className="col-qty">{qty}</td>
                      <td className="col-price">{price > 0 ? `$${price.toFixed(2)}` : ''}</td>
                      <td className="col-total">{total > 0 ? `$${total.toFixed(2)}` : ''}</td>
                      <td className="col-rem">{item.item_notes || item.remarks || ''}</td>
                    </tr>
                  );
                })}
                {fillerRows.map((_, i) => (
                  <tr key={`filler-${i}`}>
                    <td className="col-num" style={{ color: '#bbb' }}>{lineItems.length + i + 1}</td>
                    <td /><td /><td /><td /><td /><td /><td />
                  </tr>
                ))}
                <tr style={{ background: '#EFF6FF' }}>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, paddingRight: 8 }}>
                    TOTAL
                  </td>
                  <td />
                  <td className="col-total" style={{ fontWeight: 800, fontSize: '9pt', color: '#1A2B4A' }}>
                    ${estGoodsCost.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>

            <table className="sig-table">
              <tbody>
                <tr>
                  <td>In charge of supply</td>
                  <td>Reviewer</td>
                  <td>Approver</td>
                </tr>
              </tbody>
            </table>

            <div style={{
              textAlign: 'right', fontSize: '6.5pt', color: '#aaa',
              paddingTop: 4, fontStyle: 'italic'
            }}>
              Generated by HCOMS · MoStar Industries · WHO AFRO OSL · {today}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
