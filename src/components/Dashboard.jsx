import { useState, useEffect, useMemo } from 'react';
import { WHO_BLUE, STATUS_CONFIG } from '../constants';
import { getStatusStyle, formatDateTime, getTimeElapsed, getPendingDurationClass } from '../utils/helpers';
import { chatAPI } from '../services/api';
import StatCard from './StatCard';
import { getRealItemImage } from '../lib/real-images';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

function Dashboard({ stats, role, orders, commodities = [], onViewOrder, currentUser }) {
  const [messageCounts, setMessageCounts] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [weeksToShow, setWeeksToShow] = useState(8);
  const [commoditiesToShow, setCommoditiesToShow] = useState(5);
  const [countriesToShow, setCountriesToShow] = useState(5);
  const [filters, setFilters] = useState({
    country: '',
    status: '',
    priority: '',
    warehouse: '',
    dateFrom: '',
    dateTo: ''
  });

  // Apply filters to orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Country filter
      if (filters.country && order.country !== filters.country) return false;

      // Status filter
      if (filters.status && order.status !== filters.status) return false;

      // Priority filter
      if (filters.priority && order.priority !== filters.priority) return false;

      // Warehouse filter
      if (filters.warehouse && order.fulfillment_warehouse_code !== filters.warehouse) return false;

      // Date range filter
      if (filters.dateFrom) {
        const orderDate = new Date(order.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (orderDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const orderDate = new Date(order.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }

      return true;
    });
  }, [orders, filters]);

  const recentOrders = filteredOrders.slice(0, 5);

  // Get unique values for filter dropdowns
  const uniqueCountries = [...new Set(orders.map(o => o.country))].sort();
  const uniqueWarehouses = [...new Set(orders.map(o => o.fulfillment_warehouse_code).filter(Boolean))].sort();

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      country: '',
      status: '',
      priority: '',
      warehouse: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Fetch message counts when orders change
  useEffect(() => {
    const fetchMessageCounts = async () => {
      if (recentOrders && recentOrders.length > 0) {
        const orderIds = recentOrders.map(o => o.id);
        try {
          const response = await chatAPI.getMessageCountsBatch(orderIds);
          if (response.success) {
            setMessageCounts(response.data.counts || {});
          }
        } catch (err) {
          console.error('Failed to fetch message counts:', err);
        }
      }
    };
    fetchMessageCounts();
  }, [recentOrders]);

  // Check if order is in a pending state
  const isPending = (status) => {
    return ['Submitted', 'Forwarded to OSL', 'Partially Fulfilled'].includes(status);
  };

  // Featured items logic
  const featuredItems = useMemo(() => {
    const importantCategories = [
      "Emergency Health Kits",
      "Pharmaceuticals",
      "Biomedical Equipment",
      "Cold Chain Equipment",
    ];
    const prioritizedItems = commodities
      .filter(item => importantCategories.includes(item.category))
      .sort((a, b) => (parseInt(a.stock, 10) || 0) - (parseInt(b.stock, 10) || 0));

    const sourceItems = prioritizedItems.length > 0 ? prioritizedItems : commodities;
    return sourceItems
      .slice(0, 4);
  }, [commodities]);

  // Format welcome message with username and country
  const getWelcomeMessage = () => {
    const name = currentUser?.name || 'User';
    const country = currentUser?.country;

    if (country) {
      return `${name}, ${country}`;
    }
    return name;
  };

  // Process chart data
  const chartData = useMemo(() => {
    // Orders by week (dynamic number of weeks)
    const weeklyData = {};
    const now = new Date();
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekKey = `Week ${weeksToShow - i}`;
      weeklyData[weekKey] = { week: weekKey, orders: 0, shipped: 0 };
    }

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const weeksDiff = Math.floor((now - orderDate) / (7 * 24 * 60 * 60 * 1000));
      if (weeksDiff >= 0 && weeksDiff < weeksToShow) {
        const weekKey = `Week ${weeksToShow - weeksDiff}`;
        if (weeklyData[weekKey]) {
          weeklyData[weekKey].orders += 1;
          if (order.status === 'Shipped' || order.status === 'Completed') {
            weeklyData[weekKey].shipped += 1;
          }
        }
      }
    });

    // Orders by status
    const statusData = {};
    filteredOrders.forEach(order => {
      statusData[order.status] = (statusData[order.status] || 0) + 1;
    });

    // Orders by priority
    const priorityData = [
      { name: 'High', value: filteredOrders.filter(o => o.priority === 'High').length },
      { name: 'Medium', value: filteredOrders.filter(o => o.priority === 'Medium').length },
      { name: 'Low', value: filteredOrders.filter(o => o.priority === 'Low').length }
    ];

    // Orders by country (dynamic top N)
    const countryData = {};
    filteredOrders.forEach(order => {
      const country = order.country || 'Unknown';
      countryData[country] = (countryData[country] || 0) + 1;
    });
    const topCountries = Object.entries(countryData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, countriesToShow)
      .map(([name, value]) => ({ name, orders: value }));

    // Orders by commodity (dynamic top N) - count total quantity ordered
    // Filter orders based on role to show relevant commodities
    const commodityData = {};
    const relevantOrders = filteredOrders.filter(order => {
      // Laboratory Team: Show commodities from orders in their review queue
      if (role === 'Laboratory Team') {
        return ['Submitted', 'Forwarded to OSL', 'Approved', 'Partially Fulfilled', 'Shipped'].includes(order.status);
      }
      // OSL Team: Show commodities from orders in their fulfillment queue
      if (role === 'OSL Team') {
        return ['Forwarded to OSL', 'Approved', 'Partially Fulfilled', 'Shipped'].includes(order.status);
      }
      // Country Office and Super Admin: Show all filtered orders
      return true;
    });

    relevantOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const commodityName = item.commodity?.name || 'Unknown';
          if (!commodityData[commodityName]) {
            commodityData[commodityName] = 0;
          }
          commodityData[commodityName] += item.quantity || 0;
        });
      }
    });
    const topCommodities = Object.entries(commodityData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, commoditiesToShow)
      .map(([name, value]) => ({ name, quantity: value }));

    // OSL Turnaround Time Analysis
    const turnaroundData = {
      fast: 0,      // < 24 hours
      moderate: 0,  // 24-72 hours
      slow: 0,      // 73-168 hours (1 week)
      critical: 0   // > 168 hours
    };

    let totalTurnaroundHours = 0;
    let turnaroundCount = 0;

    filteredOrders.forEach(order => {
      if (order.osl_forwarded_at && order.osl_approved_at) {
        const forwardedDate = new Date(order.osl_forwarded_at);
        const approvedDate = new Date(order.osl_approved_at);
        const turnaroundHours = (approvedDate - forwardedDate) / (1000 * 60 * 60);

        totalTurnaroundHours += turnaroundHours;
        turnaroundCount++;

        if (turnaroundHours < 24) {
          turnaroundData.fast++;
        } else if (turnaroundHours < 72) {
          turnaroundData.moderate++;
        } else if (turnaroundHours < 168) {
          turnaroundData.slow++;
        } else {
          turnaroundData.critical++;
        }
      }
    });

    const averageTurnaroundHours = turnaroundCount > 0 ? totalTurnaroundHours / turnaroundCount : 0;
    const averageTurnaroundDays = (averageTurnaroundHours / 24).toFixed(1);

    const turnaroundChartData = [
      { name: '< 24h', value: turnaroundData.fast, label: 'Fast' },
      { name: '24-72h', value: turnaroundData.moderate, label: 'Moderate' },
      { name: '3-7d', value: turnaroundData.slow, label: 'Slow' },
      { name: '> 7d', value: turnaroundData.critical, label: 'Critical' }
    ];

    return {
      weekly: Object.values(weeklyData),
      status: Object.entries(statusData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      priority: priorityData,
      countries: topCountries,
      commodities: topCommodities,
      turnaround: turnaroundChartData,
      averageTurnaround: averageTurnaroundDays,
      turnaroundCount: turnaroundCount
    };
  }, [filteredOrders, weeksToShow, commoditiesToShow, countriesToShow, role]);

  return (
    <div className="dashboard">
      {/* Welcome Banner */}
      {/*<div className="dashboard-welcome">
        <div className="welcome-text">
          <span className="welcome-greeting">Welcome back,</span>
          <span className="welcome-user">{getWelcomeMessage()}</span>
        </div>
        <div className="welcome-role">{role}</div>
      </div>*/}

      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h2 className="dashboard-title">Dashboard Overview</h2>
          <p className="dashboard-welcome-subtitle">Welcome back, {getWelcomeMessage()}</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`dashboard-filter-toggle ${showFilters ? 'active' : ''}`}
        >
          🔍 {showFilters ? 'Hide' : 'Show'} Filters
          {hasActiveFilters && <span className="filter-active-indicator"></span>}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="dashboard-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Country</label>
              <select
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                className="filter-select"
              >
                <option value="">All Countries</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="Submitted">Submitted</option>
                <option value="Forwarded to OSL">Forwarded to OSL</option>
                <option value="Approved">Approved</option>
                <option value="Partially Fulfilled">Partially Fulfilled</option>
                <option value="Shipped">Shipped</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="filter-select"
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Warehouse</label>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                className="filter-select"
              >
                <option value="">All Warehouses</option>
                {uniqueWarehouses.map(warehouse => (
                  <option key={warehouse} value={warehouse}>{warehouse}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <button onClick={handleResetFilters} className="reset-filters-btn" disabled={!hasActiveFilters}>
                Reset Filters
              </button>
            </div>
          </div>

          <div className="filter-summary">
            Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="dashboard-stats">
        {role === 'Country Office' && (
          <>
            <StatCard label="Total Orders" value={stats.total} color={WHO_BLUE} />
            <StatCard label="Pending Review" value={stats.pending} color="#D97706" />
            <StatCard label="Approved" value={stats.approved} color="#059669" />
            <StatCard label="Shipped/Completed" value={stats.shipped} color="#0891B2" />
          </>
        )}
        {role === 'Laboratory Team' && (
          <>
            <StatCard label="Total Requests" value={stats.total} color={WHO_BLUE} />
            <StatCard label="Pending Review" value={stats.pendingReview} color="#D97706" highlight />
            <StatCard label="Forwarded to OSL" value={stats.forwarded} color="#2563EB" />
            <StatCard label="Processed" value={stats.processed} color="#059669" />
          </>
        )}
        {role === 'OSL Team' && (
          <>
            <StatCard label="Total in Queue" value={stats.total} color={WHO_BLUE} />
            <StatCard label="Pending Approval" value={stats.pendingApproval} color="#D97706" highlight />
            <StatCard label="Approved" value={stats.approved} color="#059669" />
            <StatCard label="Low Stock Items" value={stats.lowStockItems} color="#DC2626" />
          </>
        )}
      </div>

      {/* Featured Supplies Section */}
      <div className="dashboard-featured-section" style={{ marginBottom: '32px' }}>
        <h3 className="dashboard-section-title">Critical Emergency Supplies</h3>
        <div className="featured-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px',
          marginTop: '16px' 
        }}>
          {featuredItems.map(item => {
            const itemImage = getRealItemImage(item);
            return (
              <div key={item.id} className="featured-item-card" style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}>
                <div style={{ 
                  height: '160px', 
                  background: '#F8FAFC', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {itemImage ? (
                    <img src={itemImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '48px' }}>{item.icon || '📦'}</span>
                  )}
                </div>
                <div>
                  <span style={{ 
                    fontSize: '10px', 
                    textTransform: 'uppercase', 
                    color: '#0093D5', 
                    fontWeight: '700',
                    letterSpacing: '0.5px'
                  }}>{item.category}</span>
                  <h4 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    margin: '4px 0',
                    lineHeight: '1.4',
                    height: '40px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical'
                  }}>{item.name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Stock: <strong>{item.stock}</strong></span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: item.stock < 100 ? '#DC2626' : '#059669',
                      fontWeight: '600'
                    }}>
                      {item.stock < 100 ? '⚠️ Critical' : '✓ Available'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      {filteredOrders.length > 0 && (
        <div className="dashboard-charts">
          <h3 className="dashboard-section-title">Analytics Overview</h3>

          <div className="charts-grid">
            {/* Weekly Orders Trend */}
            <div className="chart-card chart-wide">
              <div className="chart-header">
                <h4 className="chart-title">Orders & Shipments Trend (Last {weeksToShow} Weeks)</h4>
                <div className="chart-metric">
                  <span className="metric-label">Show:</span>
                  <select
                    value={weeksToShow}
                    onChange={(e) => setWeeksToShow(parseInt(e.target.value))}
                    className="weeks-select"
                  >
                    <option value={4}>4 weeks</option>
                    <option value={8}>8 weeks</option>
                    <option value={12}>12 weeks</option>
                    <option value={16}>16 weeks</option>
                    <option value={20}>20 weeks</option>
                    <option value={24}>24 weeks</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="week" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="orders" stroke="#009ADE" strokeWidth={2} name="Total Orders" />
                  <Line type="monotone" dataKey="shipped" stroke="#059669" strokeWidth={2} name="Shipped" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Orders by Status */}
            <div className="chart-card">
              <h4 className="chart-title">Orders by Status</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.status}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} angle={-25} textAnchor="end" height={84} tick={{ dy: 10 }} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Orders">
                    {chartData.status.map((entry, index) => {
                      const statusColor = STATUS_CONFIG[entry.name]?.color || '#009ADE';
                      return <Cell key={`cell-${index}`} fill={statusColor} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Orders by Priority */}
            <div className="chart-card">
              <h4 className="chart-title">Orders by Priority</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.priority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Orders">
                    {chartData.priority.map((entry, index) => {
                      const colors = {
                        'High': '#DC2626',
                        'Medium': '#D97706',
                        'Low': '#059669'
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#009ADE'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Commodities */}
            <div className="chart-card chart-wide">
              <div className="chart-header">
                <h4 className="chart-title">Top {commoditiesToShow} Commodities by Order Volume</h4>
                <div className="chart-metric">
                  <span className="metric-label">Show:</span>
                  <select
                    value={commoditiesToShow}
                    onChange={(e) => setCommoditiesToShow(parseInt(e.target.value))}
                    className="weeks-select"
                  >
                    <option value={3}>Top 3</option>
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={15}>Top 15</option>
                    <option value={20}>Top 20</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.commodities}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="quantity" fill="#059669" radius={[8, 8, 0, 0]} name="Total Quantity Ordered" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Countries - hidden for Country Office (they only see their own country) */}
            {role !== 'Country Office' && (
              <div className="chart-card chart-wide">
                <div className="chart-header">
                  <h4 className="chart-title">Top {countriesToShow} Countries by Order Volume</h4>
                  <div className="chart-metric">
                    <span className="metric-label">Show:</span>
                    <select
                      value={countriesToShow}
                      onChange={(e) => setCountriesToShow(parseInt(e.target.value))}
                      className="weeks-select"
                    >
                      <option value={3}>Top 3</option>
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                      <option value={15}>Top 15</option>
                      <option value={20}>Top 20</option>
                    </select>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.countries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#64748B" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} width={120} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                    <Bar dataKey="orders" fill="#009ADE" radius={[0, 8, 8, 0]} name="Total Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* OSL Turnaround Time */}
            {chartData.turnaroundCount > 0 && (
              <div className="chart-card chart-wide">
                <div className="chart-header">
                  <h4 className="chart-title">OSL Turnaround Time Distribution</h4>
                  <div className="chart-metric">
                    <span className="metric-label">Average:</span>
                    <span className="metric-value">{chartData.averageTurnaround} days</span>
                    <span className="metric-count">({chartData.turnaroundCount} orders)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.turnaround}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Number of Orders">
                      {chartData.turnaround.map((entry, index) => {
                        const colors = ['#059669', '#F59E0B', '#D97706', '#DC2626'];
                        return <Cell key={`cell-${index}`} fill={colors[index]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="dashboard-recent">
        <div className="dashboard-recent-header">
          <h3 className="dashboard-recent-title">Recent Activity</h3>
        </div>
        <div>
          {recentOrders.length === 0 ? (
            <p className="dashboard-recent-empty">No orders to display</p>
          ) : (
            recentOrders.map(order => {
              const statusStyle = getStatusStyle(order.status);
              const orderDate = formatDateTime(order.created_at, { short: true });
              const showPendingCounter = isPending(order.status);
              const pendingTime = getTimeElapsed(order.created_at);
              const durationClass = getPendingDurationClass(order.created_at);

              return (
                <div
                  key={order.id}
                  onClick={() => onViewOrder(order)}
                  className="dashboard-order-item"
                >
                  <div>
                    <span className="dashboard-order-id">{order.order_number}</span>
                    {messageCounts[order.id] > 0 && (
                      <span className="message-count-badge" title={`${messageCounts[order.id]} message(s)`}>
                        💬 {messageCounts[order.id]}
                      </span>
                    )}
                    <span className="dashboard-order-country">{order.country}</span>
                    {order.intervention_type && (
                      <span className="dashboard-order-intervention">
                        {order.intervention_type}
                      </span>
                    )}
                  </div>
                  <div className="dashboard-order-meta">
                    <span
                      className="status-badge"
                      style={{ color: statusStyle.color, background: statusStyle.background }}
                    >
                      {order.status}
                    </span>
                    <div className="dashboard-date-pending">
                      <span className="dashboard-order-date">{orderDate}</span>
                      {showPendingCounter && pendingTime && (
                        <span className={`pending-counter ${durationClass}`}>
                          ⏱ {pendingTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
