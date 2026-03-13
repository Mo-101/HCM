import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ordersAPI, countriesAPI, aiAPI } from '../../services/api';
import '../../styles/modals/Modal.css';
import '../../styles/modals/NewOrderModal.css';

const parseAIResponse = (content) => {
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    const jsonBlock = content.match(/```json\s*([\s\S]*?)\s*```/i)?.[1] || content.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonBlock) return null;

    try {
      return JSON.parse(jsonBlock);
    } catch {
      return null;
    }
  }
};

const findCommodityByName = (commodities, name) => {
  if (!name) return null;

  const normalizedName = name.trim().toLowerCase();
  return (
    commodities.find(c => c.name?.trim().toLowerCase() === normalizedName) ||
    commodities.find(c => c.name?.trim().toLowerCase().includes(normalizedName)) ||
    commodities.find(c => normalizedName.includes(c.name?.trim().toLowerCase()))
  );
};

function NewOrderModal({ commodities, cart, setCart, country, userRole, currentUser, onClose, onSubmit, draft, onSaveDraft }) {
  const [draftId, setDraftId] = useState(draft?.id || null);
  const [priority, setPriority] = useState(draft?.priority || 'Medium');
  const [notes, setNotes] = useState(draft?.notes || '');
  const [pateoRef, setPateoRef] = useState(draft?.pateoRef || draft?.pateo_ref || '');
  const [pateoFile, setPateoFile] = useState(draft?.pateoFile || draft?.pateo_file || '');
  const [pateoFileName, setPateoFileName] = useState('');
  const [interventionType, setInterventionType] = useState(draft?.interventionType || draft?.intervention_type || '');
  const [situationStartDate, setSituationStartDate] = useState(draft?.situationDate ? draft.situationDate.split('T')[0] : draft?.situation_date ? draft.situation_date.split('T')[0] : '');
  const [isOutbreak, setIsOutbreak] = useState(false);
  const [interventionTypes, setInterventionTypes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState([]);
  
  // Lab team can select target country
  const isLabTeam = userRole === 'Laboratory Team';
  const [targetCountry, setTargetCountry] = useState(country || '');
  const [countries, setCountries] = useState([]);
  
  // Shipping details state
  const [deliveryContactName, setDeliveryContactName] = useState(draft?.deliveryContactName || draft?.delivery_contact_name || '');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState(draft?.deliveryContactPhone || draft?.delivery_contact_phone || '');
  const [deliveryContactEmail, setDeliveryContactEmail] = useState(draft?.deliveryContactEmail || draft?.delivery_contact_email || '');
  const [deliveryAddress, setDeliveryAddress] = useState(draft?.deliveryAddress || draft?.delivery_address || '');
  const [deliveryCity, setDeliveryCity] = useState(draft?.deliveryCity || draft?.delivery_city || '');
  const [deliveryCountry, setDeliveryCountry] = useState(draft?.deliveryCountry || draft?.delivery_country || country || '');
  const [preferredShippingMethod, setPreferredShippingMethod] = useState(draft?.preferredShippingMethod || draft?.preferred_shipping_method || '');

  // Load draft items into cart on mount
  useEffect(() => {
    if (draft && draft.items && draft.items.length > 0) {
      const draftItems = draft.items.map(item => ({
        commodity: {
          id: item.commodity?.id || item.commodity_id,
          name: item.commodity?.name || item.name,
          category: item.commodity?.category || item.category,
          unit: item.commodity?.unit || item.unit,
          price: item.commodity?.price || item.unitPrice || item.unit_price
        },
        qty: item.quantity
      }));
      setCart(draftItems);
    }
  }, [draft]);

  // Fetch intervention types on mount
  useEffect(() => {
    const fetchInterventionTypes = async () => {
      try {
        const response = await ordersAPI.getInterventionTypes();
        if (response.success) {
          setInterventionTypes(response.data.interventionTypes);
        }
      } catch (err) {
        console.error('Failed to fetch intervention types:', err);
        // Fallback list
        setInterventionTypes([
          { id: 1, name: 'Cholera', is_outbreak_related: true },
          { id: 2, name: 'Malaria', is_outbreak_related: false },
          { id: 3, name: 'Mpox', is_outbreak_related: true },
          { id: 4, name: 'COVID-19', is_outbreak_related: true },
          { id: 5, name: 'HIV/AIDS', is_outbreak_related: false },
          { id: 6, name: 'Tuberculosis', is_outbreak_related: false },
          { id: 7, name: 'Routine Laboratory', is_outbreak_related: false },
          { id: 8, name: 'Surveillance', is_outbreak_related: false },
          { id: 9, name: 'Other', is_outbreak_related: false }
        ]);
      }
    };
    fetchInterventionTypes();
  }, []);

  // Fetch countries for Lab team from API
  useEffect(() => {
    if (isLabTeam) {
      const fetchCountries = async () => {
        try {
          const response = await countriesAPI.getAll();
          if (response.success) {
            setCountries(response.data.countries.map(c => c.name));
          }
        } catch (err) {
          console.error('Failed to fetch countries:', err);
        }
      };
      fetchCountries();
    }
  }, [isLabTeam]);

  // Auto-set outbreak flag when intervention type changes
  const handleInterventionChange = (value) => {
    setInterventionType(value);
    const selectedType = interventionTypes.find(t => t.name === value);
    if (selectedType) {
      setIsOutbreak(selectedType.is_outbreak_related);
    }
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart(cart.filter(c => c.commodity.id !== id));
    } else {
      setCart(cart.map(c => c.commodity.id === id ? { ...c, qty } : c));
    }
  };

  const addItem = (commodity) => {
    if (!commodity) return;
    if (!cart.find(c => c.commodity.id === commodity.id)) {
      setCart([...cart, { commodity, qty: 1 }]);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!interventionType) {
      toast.error('Select an intervention type before requesting AI recommendations');
      return;
    }

    setAiLoading(true);
    setAiSummary('');
    setAiRecommendations([]);

    try {
      const availableCatalog = commodities.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        stock: item.stock,
        price: item.price,
        description: item.description
      }));

      const response = await aiAPI.chat([
        {
          role: 'system',
          content: [
            'You are a WHO AFRO logistics assistant.',
            'Use only the supplied commodity catalog.',
            'Recommend the most relevant items for the intervention context.',
            'Return strict JSON with this shape:',
            '{"summary":"...", "recommendations":[{"name":"exact catalog item name","reason":"...", "priority":"High|Medium|Low"}]}'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            requestContext: {
              interventionType,
              isOutbreak,
              targetCountry: isLabTeam ? targetCountry : deliveryCountry || country,
              requestingUser: currentUser?.name || currentUser?.email || 'Unknown user',
              priority,
              notes,
              currentCart: cart.map(item => ({
                name: item.commodity.name,
                quantity: item.qty
              }))
            },
            availableCatalog
          })
        }
      ], {
        temperature: 0.2,
        maxTokens: 1000
      });

      const content = response?.data?.choices?.[0]?.message?.content || '';
      const parsed = parseAIResponse(content);

      if (!parsed?.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('AI response was not in the expected format');
      }

      const matchedRecommendations = parsed.recommendations
        .map(rec => {
          const commodity = findCommodityByName(commodities, rec.name);
          if (!commodity) return null;

          return { ...rec, commodity };
        })
        .filter(Boolean);

      setAiSummary(parsed.summary || 'Recommended items based on the live BMS catalog.');
      setAiRecommendations(matchedRecommendations);

      if (matchedRecommendations.length === 0) {
        toast.error('AI returned suggestions, but none matched the current BMS catalog exactly');
      }
    } catch (err) {
      console.error('AI recommendation error:', err);
      toast.error(err.message || 'Failed to generate AI recommendations');
    } finally {
      setAiLoading(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.commodity.price) * item.qty), 0);

  // Build common order data
  const buildOrderData = () => ({
    id: draftId,
    priority,
    pateoRef,
    pateoFile,
    notes,
    interventionType: interventionType || null,
    situationStartDate: situationStartDate || null,
    isOutbreak,
    targetCountry: isLabTeam ? targetCountry : null,
    items: cart.map(item => ({
      commodityId: item.commodity.id,
      quantity: item.qty
    })),
    deliveryContactName,
    deliveryContactPhone,
    deliveryContactEmail,
    deliveryAddress,
    deliveryCity,
    deliveryCountry: deliveryCountry || targetCountry || country,
    preferredShippingMethod
  });

  // Save as draft
  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      toast.error('Please add at least one item to save as draft');
      return;
    }
    if (situationStartDate && new Date(situationStartDate) > new Date()) {
      toast.error('Situation start date cannot be in the future');
      return;
    }

    setIsSavingDraft(true);

    try {
      const draftData = buildOrderData();
      const response = await ordersAPI.saveDraft(draftData);
      
      if (response.success) {
        setDraftId(response.data.draft.id); // Update draftId for subsequent saves
        toast.success(draftId ? 'Draft updated' : 'Saved as draft');
        if (onSaveDraft) {
          onSaveDraft(response.data.draft);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit order (or submit draft)
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to your order');
      return;
    }
    if (isLabTeam && !targetCountry) {
      toast.error('Please select a target country');
      return;
    }
    if (!interventionType) {
      toast.error('Intervention Type is required');
      return;
    }
    if (!pateoRef) {
      toast.error('PATEO Reference is required');
      return;
    }
    if (!deliveryContactName || !deliveryContactPhone || !deliveryAddress) {
      toast.error('Delivery contact name, phone, and address are required');
      return;
    }
    if (situationStartDate && new Date(situationStartDate) > new Date()) {
      toast.error('Situation start date cannot be in the future');
      return;
    }

    setIsSubmitting(true);

    try {
      if (draftId) {
        // Submit existing draft
        const response = await ordersAPI.submitDraft(draftId, { pateoRef, pateoFile });
        if (response.success) {
          toast.success('Order submitted successfully!');
          setCart([]);
          onClose();
        }
      } else {
        // Create new order directly
        const orderData = buildOrderData();
        await onSubmit(orderData);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal new-order-modal landscape">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <h2 className="modal-title">
              {draftId ? '✏️ Edit Draft Order' : 'Create New Order'}
            </h2>
            <div className="header-badges">
              {isLabTeam ? (
                <div className="target-country-selector">
                  <label>Order for:</label>
                  <select 
                    value={targetCountry} 
                    onChange={(e) => {
                      setTargetCountry(e.target.value);
                      setDeliveryCountry(e.target.value);
                    }}
                    className="country-select"
                  >
                    <option value="">Select Country...</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="new-order-country-badge">{country} Country Office</div>
              )}
              {draftId && (
                <div className="draft-badge">Draft: {draft?.order_number || draft?.orderNumber}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" disabled={isSubmitting || isSavingDraft}>×</button>
        </div>

        <div className="modal-body landscape-body">
          {/* Left Panel - Commodities Selection */}
          <div className="order-panel left-panel panel-scrollable">
            <div className="panel-header">
              <h3>📦 Order Items</h3>
              <span className="item-count">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Add Items */}
            <div className="commodity-selector">
              <select
                onChange={e => {
                  if (e.target.value) {
                    addItem(commodities.find(c => c.id === parseInt(e.target.value)));
                    e.target.value = '';
                  }
                }}
                className="form-select"
                disabled={isSubmitting}
              >
                <option value="">+ Add commodity...</option>
                {commodities
                  .filter(c => !cart.find(item => item.commodity.id === c.id))
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - ${parseFloat(c.price).toFixed(2)}/{c.unit}
                    </option>
                ))}
              </select>
            </div>

            <div className="ai-recommendation-panel">
              <div className="ai-recommendation-header">
                <div>
                  <h4>AI Recommendations</h4>
                  <p>Uses Azure AI with the live BMS commodity list</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRecommendations}
                  className="btn btn-outline ai-recommendation-btn"
                  disabled={isSubmitting || isSavingDraft || aiLoading || commodities.length === 0}
                >
                  {aiLoading ? 'Generating...' : 'Suggest Items'}
                </button>
              </div>

              {aiSummary && <p className="ai-recommendation-summary">{aiSummary}</p>}

              {aiRecommendations.length > 0 && (
                <div className="ai-recommendation-list">
                  {aiRecommendations.map(({ commodity, reason, priority: recPriority }) => {
                    const alreadyAdded = cart.some(item => item.commodity.id === commodity.id);
                    return (
                      <div key={commodity.id} className="ai-recommendation-item">
                        <div className="ai-recommendation-copy">
                          <div className="ai-recommendation-name-row">
                            <span className="ai-recommendation-name">{commodity.name}</span>
                            <span className={`ai-recommendation-priority ${String(recPriority || '').toLowerCase()}`}>
                              {recPriority || 'Recommended'}
                            </span>
                          </div>
                          <div className="ai-recommendation-meta">
                            {commodity.category} · {commodity.unit} · Stock {commodity.stock}
                          </div>
                          <p>{reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addItem(commodity)}
                          className="btn btn-primary ai-add-btn"
                          disabled={alreadyAdded || isSubmitting}
                        >
                          {alreadyAdded ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="cart-container">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  <span className="cart-empty-icon">🛒</span>
                  <p>No items added yet</p>
                  <p className="cart-empty-hint">Select commodities from the dropdown above</p>
                </div>
              ) : (
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.commodity.id} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.commodity.name}</div>
                        <div className="cart-item-unit">{item.commodity.unit}</div>
                      </div>
                      <div className="cart-item-controls">
                        <button
                          onClick={() => updateQty(item.commodity.id, item.qty - 1)}
                          className="qty-btn"
                          disabled={isSubmitting}
                        >
                          −
                        </button>
                        <span className="qty-value">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.commodity.id, item.qty + 1)}
                          className="qty-btn"
                          disabled={isSubmitting}
                        >
                          +
                        </button>
                      </div>
                      <div className="cart-item-price">
                        ${(parseFloat(item.commodity.price) * item.qty).toFixed(2)}
                      </div>
                      <button
                        onClick={() => updateQty(item.commodity.id, 0)}
                        className="cart-item-remove"
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Total */}
            {cart.length > 0 && (
              <div className="cart-total">
                <span>Order Total</span>
                <span className="cart-total-value">${total.toFixed(2)}</span>
              </div>
            )}

            {/* Priority & Notes at bottom of left panel */}
            <div className="order-meta">
              <div className="form-group-compact">
                <label className="form-label">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High - Urgent</option>
                </select>
              </div>
              <div className="form-group-compact">
                <label className="form-label">Notes / Justification</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Reason for order, special instructions..."
                  className="form-input"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Order Details */}
          <div className="order-panel right-panel">
            <div className="panel-scrollable">
              {/* Intervention Section */}
              <div className="form-section intervention-section">
                <h4 className="section-title">🏥 Intervention Details</h4>
                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label">Type of Intervention *</label>
                    <select
                      value={interventionType}
                      onChange={e => handleInterventionChange(e.target.value)}
                      className="form-select"
                      disabled={isSubmitting}
                    >
                      <option value="">Select type...</option>
                      {interventionTypes.map(type => (
                        <option key={type.id || type.name} value={type.name}>
                          {type.name} {type.is_outbreak_related ? '🔴' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-half">
                    <label className="form-label">Situation Start Date <span className="optional">(Optional)</span></label>
                    <input
                      type="date"
                      value={situationStartDate}
                      onChange={e => setSituationStartDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                {isOutbreak && (
                  <div className="outbreak-badge">
                    ⚠️ Outbreak-related request - Priority handling applied
                  </div>
                )}
              </div>

              {/* PATEO Section */}
              <div className="form-section pateo-section">
                <h4 className="section-title">📋 PATEO Authorization</h4>
                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label">Reference Number *</label>
                    <input
                      type="text"
                      value={pateoRef}
                      onChange={e => setPateoRef(e.target.value)}
                      placeholder="PATEO-NG-2024-0158"
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group-half">
                    <label className="form-label">Document Attachment (Optional)</label>
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        id="pateo-file-input"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setPateoFileName(file.name);
                            // Store file name for now - in production this would upload to server
                            setPateoFile(file.name);
                          }
                        }}
                        className="file-input-hidden"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="pateo-file-input" className="file-upload-btn">
                        📎 Choose File
                      </label>
                      <span className="file-name">
                        {pateoFileName || pateoFile || 'No file chosen'}
                      </span>
                      {(pateoFileName || pateoFile) && (
                        <button
                          type="button"
                          className="file-clear-btn"
                          onClick={() => {
                            setPateoFile('');
                            setPateoFileName('');
                            document.getElementById('pateo-file-input').value = '';
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span className="form-hint">Accepted: PDF, DOC, DOCX, JPG, PNG</span>
                  </div>
                </div>
              </div>

              {/* Shipping Section */}
              <div className="form-section shipping-section">
                <h4 className="section-title">📦 Shipping / Consignee Details</h4>
                
                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label">Contact Name *</label>
                    <input
                      type="text"
                      value={deliveryContactName}
                      onChange={e => setDeliveryContactName(e.target.value)}
                      placeholder="Full name"
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group-half">
                    <label className="form-label">Contact Phone *</label>
                    <input
                      type="tel"
                      value={deliveryContactPhone}
                      onChange={e => setDeliveryContactPhone(e.target.value)}
                      placeholder="+234 xxx xxx xxxx"
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label">Contact Email</label>
                    <input
                      type="email"
                      value={deliveryContactEmail}
                      onChange={e => setDeliveryContactEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group-half">
                    <label className="form-label">Shipping Method</label>
                    <select
                      value={preferredShippingMethod}
                      onChange={e => setPreferredShippingMethod(e.target.value)}
                      className="form-select"
                      disabled={isSubmitting}
                    >
                      <option value="">Select method...</option>
                      <option value="Air Freight">Air Freight (Fastest)</option>
                      <option value="Sea Freight">Sea Freight</option>
                      <option value="Road Transport">Road Transport</option>
                      <option value="Courier">Courier (DHL/FedEx)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Address *</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Full delivery address..."
                    className="form-input"
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group-half">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={e => setDeliveryCity(e.target.value)}
                      placeholder="City"
                      className="form-input"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group-half">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      value={deliveryCountry}
                      onChange={e => setDeliveryCountry(e.target.value)}
                      placeholder="Country"
                      className="form-input"
                      disabled={isSubmitting || isSavingDraft}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <div className="footer-left">
            <button
              onClick={handleSaveDraft}
              className="btn btn-outline"
              disabled={isSubmitting || isSavingDraft || cart.length === 0 || (isLabTeam && !targetCountry)}
            >
              {isSavingDraft ? 'Saving...' : (draftId ? '💾 Update Draft' : '💾 Save as Draft')}
            </button>
            {draftId && (
              <span className="draft-indicator">
                ✓ Editing draft
              </span>
            )}
          </div>
          <div className="footer-right">
            <button onClick={onClose} className="btn btn-secondary" disabled={isSubmitting || isSavingDraft}>
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              className="btn btn-primary" 
              disabled={isSubmitting || isSavingDraft || cart.length === 0}
            >
              {isSubmitting ? 'Submitting...' : `Submit Order${cart.length > 0 ? ` ($${total.toFixed(2)})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewOrderModal;
