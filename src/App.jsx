import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { authAPI, ordersAPI, commoditiesAPI } from './services/api';
import {
  LoginScreen,
  Header,
  Dashboard,
  OrdersView,
  InventoryView,
  AdminView,
  OSLOperations,
  DraftsView,
  NewOrderModal,
  OrderDetailModal,
  AddCommodityModal,
  ProfileSettings,
  Catalogue
} from './components';
import Loading from './components/Loading';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import useInactivityTimeout from './hooks/useInactivityTimeout';

const DEV_UNLOCK_ROLES = import.meta.env.VITE_DEV_UNLOCK_ROLES === 'true';

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // App state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cart, setCart] = useState([]);
  const [stats, setStats] = useState({});

  // Modal states
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showAddCommodity, setShowAddCommodity] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // Draft editing state
  const [editingDraft, setEditingDraft] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authAPI.isAuthenticated()) {
        const storedUser = authAPI.getStoredUser();
        if (storedUser) {
          setCurrentUser(storedUser);
          setIsLoggedIn(true);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Fetch data when logged in
  const fetchData = useCallback(async (showLoading = false) => {
    if (!isLoggedIn) return;

    try {
      if (showLoading) setIsLoadingData(true);

      const [ordersRes, commoditiesRes, statsRes, warehousesRes] = await Promise.all([
        ordersAPI.getAll(),
        commoditiesAPI.getAll({ limit: 1000 }),
        ordersAPI.getStatistics(),
        commoditiesAPI.getWarehouses()
      ]);

      if (ordersRes.success) {
        setOrders(ordersRes.data.orders);
      }
      if (commoditiesRes.success) {
        setCommodities(commoditiesRes.data.commodities);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (warehousesRes.success) {
        setWarehouses(warehousesRes.data.warehouses);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load data');
    } finally {
      if (showLoading) setIsLoadingData(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData(true); // Show loading on initial data fetch
    }
  }, [isLoggedIn, fetchData]);

  // Login handler
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    toast.success(`Welcome back, ${user.name}!`);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      toast.success('Logged out successfully');
    } finally {
      localStorage.removeItem('hcoms_last_activity');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setActiveTab('dashboard');
      setCart([]);
      setOrders([]);
    }
  };

  // Auto-logout after inactivity with warning
  const handleTimeoutLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setActiveTab('dashboard');
      setCart([]);
      setOrders([]);
      toast('Session expired due to inactivity', { icon: '\u26A0\uFE0F' });
    }
  }, []);

  const { showWarning, secondsLeft, stayLoggedIn } = useInactivityTimeout(isLoggedIn, handleTimeoutLogout);

  // Lab team forwards order to OSL
  const forwardToOSL = async (orderId, warehouseId) => {
    try {
      console.log('Forwarding order:', orderId, 'to warehouse:', warehouseId);
      const response = await ordersAPI.forwardToOSL(orderId, warehouseId);
      console.log('Forward response:', response);
      if (response.success) {
        await fetchData();
        setShowOrderDetail(false);
        toast.success('Order forwarded to warehouse successfully');
      } else {
        toast.error(response.message || 'Failed to forward order');
      }
    } catch (err) {
      console.error('Forward error:', err);
      toast.error(err.message || 'Failed to forward order');
    }
  };

  // Reject order
  const rejectOrder = async (orderId) => {
    try {
      const response = await ordersAPI.reject(orderId);
      if (response.success) {
        await fetchData();
        setShowOrderDetail(false);
        toast.success('Order rejected');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject order');
    }
  };

  // OSL approves order
  const approveOrder = async (orderId) => {
    try {
      const response = await ordersAPI.approve(orderId);
      if (response.success) {
        await fetchData();
        setShowOrderDetail(false);
        toast.success('Order approved successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to approve order');
    }
  };

  // OSL marks as shipped
  const markShipped = async (orderId) => {
    try {
      const response = await ordersAPI.markShipped(orderId);
      if (response.success) {
        await fetchData();
        setShowOrderDetail(false);
        toast.success('Order marked as shipped');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark order as shipped');
    }
  };

  // OSL fulfills order with warehouse selection
  const fulfillOrder = async (orderId, warehouseId) => {
    try {
      const response = await ordersAPI.fulfill(orderId, warehouseId);
      if (response.success) {
        await fetchData();
        // Update selected order with new data
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success(response.message || 'Order fulfilled successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fulfill order');
    }
  };

  // OSL smart auto-fulfill based on proximity and stock
  const handleSmartFulfill = async (orderId) => {
    try {
      const response = await ordersAPI.smartFulfillOrder(orderId);
      if (response.success) {
        await fetchData();
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success(response.message || 'Smart fulfillment completed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fulfill order');
    }
  };

  // OSL split fulfill item from multiple warehouses
  const handleSplitFulfill = async (itemId, fulfillments) => {
    try {
      const response = await ordersAPI.splitFulfillItem(itemId, fulfillments);
      if (response.success) {
        await fetchData();
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success('Item fulfilled from multiple warehouses');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fulfill item');
    }
  };

  // OSL create shipment for order
  const handleCreateShipment = async (orderId, shipmentData) => {
    try {
      const response = await ordersAPI.createShipment(orderId, shipmentData);
      if (response.success) {
        await fetchData();
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success('Shipment created successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create shipment');
    }
  };

  // Update order item (Lab or OSL)
  const handleUpdateItem = async (orderId, itemId, data) => {
    try {
      const response = await ordersAPI.updateItem(orderId, itemId, data);
      if (response.success) {
        await fetchData();
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success('Item updated successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update item');
    }
  };

  // Add item to order (Lab only)
  const handleAddItem = async (orderId, itemData) => {
    try {
      const response = await ordersAPI.addItem(orderId, itemData);
      if (response.success) {
        await fetchData();
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success('Item added to order');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add item');
    }
  };

  // Remove item from order (Lab only)
  const handleRemoveItem = async (orderId, itemId) => {
    try {
      const response = await ordersAPI.removeItem(orderId, itemId);
      if (response.success) {
        await fetchData();
        if (response.data?.order) {
          setSelectedOrder(response.data.order);
        }
        toast.success('Item removed from order');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
    }
  };

  // Handle new order submission
  const handleNewOrder = async (orderData) => {
    try {
      const response = await ordersAPI.create(orderData);
      if (response.success) {
        await fetchData();
        setCart([]);
        setShowNewOrder(false);
        toast.success('Order submitted successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit order');
    }
  };

  // Handle add commodity
  const handleAddCommodity = async (commodityData) => {
    try {
      const response = await commoditiesAPI.create(commodityData);
      if (response.success) {
        await fetchData();
        setShowAddCommodity(false);
        toast.success('Commodity added successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add commodity');
    }
  };

  // Handle update stock
  const handleUpdateStock = async (commodityId, newStock) => {
    try {
      const response = await commoditiesAPI.updateStock(commodityId, newStock);
      if (response.success) {
        await fetchData();
        toast.success('Stock updated successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update stock');
    }
  };

  // Handle update warehouse-specific stock
  const handleUpdateWarehouseStock = async (commodityId, warehouseId, quantity) => {
    try {
      const response = await commoditiesAPI.updateWarehouseStock(commodityId, warehouseId, quantity);
      if (response.success) {
        await fetchData();
        toast.success('Warehouse stock updated');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update warehouse stock');
    }
  };

  // View order detail
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  // Get dashboard stats based on role
  const getDashboardStats = () => {
    const statistics = stats.statistics || {};
    const lowStockItems = stats.lowStockItems || 0;

    if (currentUser?.role === 'Country Office') {
      return {
        total: parseInt(statistics.total) || 0,
        pending: parseInt(statistics.submitted) || 0,
        approved: parseInt(statistics.approved) || 0,
        shipped: (parseInt(statistics.shipped) || 0) + (parseInt(statistics.completed) || 0)
      };
    }

    if (currentUser?.role === 'Laboratory Team') {
      return {
        total: parseInt(statistics.total) || 0,
        pendingReview: parseInt(statistics.submitted) || 0,
        forwarded: parseInt(statistics.forwarded) || 0,
        processed: (parseInt(statistics.approved) || 0) + (parseInt(statistics.shipped) || 0)
      };
    }

    if (currentUser?.role === 'OSL Team') {
      return {
        total: parseInt(statistics.total) || 0,
        pendingApproval: parseInt(statistics.forwarded) || 0,
        approved: parseInt(statistics.approved) || 0,
        lowStockItems
      };
    }

    return {};
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid #E2E8F0',
            borderTopColor: '#009ADE',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748B' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const dashboardStats = getDashboardStats();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onProfileSettings={() => setShowProfileSettings(true)}
        onOrderClick={async (orderId) => {
          // Fetch order and open detail modal with chat open
          if (!orderId) {
            toast.error('Invalid order reference');
            return;
          }
          try {
            const response = await ordersAPI.getById(orderId);
            if (response.success && response.data.order) {
              setSelectedOrder({ ...response.data.order, openChat: true });
              setShowOrderDetail(true);
              setActiveTab('orders');
            } else {
              toast.error('Order not found');
            }
          } catch (err) {
            console.error('Failed to load order:', err);
            toast.error('Failed to load order');
          }
        }}
      />

      {/* Main Content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        {isLoadingData ? (
          <Loading message="Loading data..." />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                stats={dashboardStats}
                role={currentUser.role}
                orders={orders}
                commodities={commodities}
                onViewOrder={handleViewOrder}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView
                orders={orders}
                role={currentUser.role}
                onNewOrder={() => setShowNewOrder(true)}
                onViewOrder={handleViewOrder}
              />
            )}

            {activeTab === 'catalogue' && (
              <Catalogue />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                commodities={commodities}
                warehouses={warehouses}
                onUpdateStock={handleUpdateStock}
                onUpdateWarehouseStock={handleUpdateWarehouseStock}
                onAddCommodity={() => setShowAddCommodity(true)}
              />
            )}

            {activeTab === 'drafts' && (DEV_UNLOCK_ROLES || currentUser.role === 'Country Office' || currentUser.role === 'Laboratory Team') && (
              <DraftsView
                onEditDraft={(draft) => {
                  setEditingDraft(draft);
                  setShowNewOrder(true);
                }}
                onRefresh={() => {
                  fetchData();
                }}
              />
            )}

            {activeTab === 'operations' && (DEV_UNLOCK_ROLES || currentUser.role === 'OSL Team') && (
              <OSLOperations warehouses={warehouses} oslAdminLevel={currentUser.oslAdminLevel} />
            )}

            {activeTab === 'admin' && (DEV_UNLOCK_ROLES || currentUser.role === 'Super Admin') && (
              <AdminView />
            )}
          </>
        )}
      </main>

      {/* New Order Modal */}
      {showNewOrder && (
        <NewOrderModal
          commodities={commodities}
          cart={cart}
          setCart={setCart}
          country={currentUser.country}
          userRole={currentUser.role}
          currentUser={currentUser}
          draft={editingDraft}
          onClose={() => {
            setShowNewOrder(false);
            setEditingDraft(null);
            setCart([]);
          }}
          onSubmit={handleNewOrder}
          onSaveDraft={() => {
            // Draft saved - stay in modal for continued editing
          }}
        />
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          role={currentUser.role}
          oslAdminLevel={currentUser.oslAdminLevel}
          currentUser={currentUser}
          commodities={commodities}
          warehouses={warehouses}
          onClose={() => {
            setShowOrderDetail(false);
            setSelectedOrder(null);
          }}
          onForward={(warehouseId) => forwardToOSL(selectedOrder.id, warehouseId)}
          onReject={() => rejectOrder(selectedOrder.id)}
          onApprove={() => approveOrder(selectedOrder.id)}
          onFulfill={fulfillOrder}
          onSmartFulfill={handleSmartFulfill}
          onSplitFulfill={handleSplitFulfill}
          onCreateShipment={handleCreateShipment}
          onShip={() => markShipped(selectedOrder.id)}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
        />
      )}

      {/* Add Commodity Modal */}
      {showAddCommodity && (
        <AddCommodityModal
          onClose={() => setShowAddCommodity(false)}
          onAdd={handleAddCommodity}
        />
      )}

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <ProfileSettings
          currentUser={currentUser}
          onProfileUpdate={(updatedUser) => {
            setCurrentUser(updatedUser);
            authAPI.updateStoredUser(updatedUser);
          }}
          onClose={() => setShowProfileSettings(false)}
        />
      )}

      {/* Session Timeout Warning */}
      {showWarning && (
        <SessionTimeoutWarning
          secondsLeft={secondsLeft}
          onStayLoggedIn={stayLoggedIn}
          onLogout={handleTimeoutLogout}
        />
      )}
    </div>
  );
}

export default App;
