# Customization Guide

This guide covers advanced customization topics for extending the template.

## 📦 Adding New Components

### Generic Reusable Component

Create components in `/components/generic/`:

```typescript
// /components/generic/MyComponent.tsx
import React from 'react';

export interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <button onClick={onAction} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
        Action
      </button>
    </div>
  );
};
```

### Feature-Specific Component

Create in `/components/features/`:

```typescript
// /components/features/ProductCard.tsx
export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  // Your component logic
};
```

---

## 🎨 Styling Customization

### Using Tailwind Classes

The template uses Tailwind CSS v4. Common customizations:

```typescript
// Primary button
className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"

// Secondary button
className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg"

// Danger button
className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"

// Card
className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"

// Input
className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
```

### Global Styles

Edit `/styles/globals.css` for global style overrides:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
.btn-primary {
  @apply bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors;
}

.card {
  @apply bg-white rounded-lg border border-gray-200 p-6 shadow-sm;
}
```

Then use them:

```typescript
<button className="btn-primary">Click me</button>
<div className="card">Content</div>
```

---

## 🔌 API Integration

### Creating API Service Files

Organize API calls by feature:

```typescript
// /lib/api/products.api.ts
import { apiRequest } from './config';

export interface Product {
  id: string;
  name: string;
  price: number;
}

export const productsApi = {
  getAll: () => apiRequest<Product[]>('/products'),
  getById: (id: string) => apiRequest<Product>(`/products/${id}`),
  create: (data: Omit<Product, 'id'>) => 
    apiRequest<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Product>) =>
    apiRequest<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest(`/products/${id}`, { method: 'DELETE' }),
};
```

Usage in components:

```typescript
import { productsApi } from '../lib/api/products.api';

const MyComponent = () => {
  const [products, setProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productsApi.getAll();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    loadProducts();
  }, []);
};
```

---

## 📊 Adding Charts

Install Recharts (already included):

```bash
npm install recharts
```

Example usage:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
];

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#6366f1" />
  </LineChart>
</ResponsiveContainer>
```

---

## 🗂️ State Management

### Using React Context

Create a custom context for feature state:

```typescript
// /context/ProductContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { productsApi, Product } from '../lib/api/products.api';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  loadProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    setProducts([...products, product]);
  };

  return (
    <ProductContext.Provider value={{ products, loading, loadProducts, addProduct }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within ProductProvider');
  return context;
};
```

Wrap in App.tsx:

```typescript
import { ProductProvider } from './context/ProductContext';

<ProductProvider>
  {/* Your app */}
</ProductProvider>
```

---

## 🔔 Notifications

Using Sonner (already integrated):

```typescript
import { toast } from 'sonner@2.0.3';

// Success
toast.success('Operation completed successfully!');

// Error
toast.error('Something went wrong!');

// Info
toast.info('Here is some information');

// Warning
toast.warning('Please be careful');

// Custom
toast('Custom message', {
  description: 'Additional details here',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
});

// With position
toast.success('Saved!', {
  position: 'top-right',
});
```

---

## 🔐 Advanced Permissions

### Granular Permission Checks

```typescript
// Check multiple permissions
const canEditProducts = hasPermission('products.update');
const canDeleteProducts = hasPermission('products.delete');

// Require all permissions
const hasAllPermissions = (perms: string[]) => 
  perms.every(p => hasPermission(p));

if (hasAllPermissions(['products.update', 'products.delete'])) {
  // Show advanced options
}

// Require any permission
const hasAnyPermission = (perms: string[]) =>
  perms.some(p => hasPermission(p));

if (hasAnyPermission(['products.view', 'products.update'])) {
  // Show product link
}
```

### Conditional Rendering

```typescript
import { useAuth } from '../components/AuthContext';

const MyComponent = () => {
  const { hasPermission, currentUser } = useAuth();
  
  return (
    <div>
      {/* Show only to admins */}
      {currentUser?.role === 'Admin' && (
        <button>Admin Action</button>
      )}
      
      {/* Show if has permission */}
      {hasPermission('products.create') && (
        <button>Create Product</button>
      )}
      
      {/* Show different content based on role */}
      {currentUser?.role === 'Admin' ? (
        <AdminPanel />
      ) : (
        <UserPanel />
      )}
    </div>
  );
};
```

---

## 📱 Responsive Design Tips

### Mobile-First Breakpoints

Tailwind breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

```typescript
// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile only</div>

// Different padding
<div className="p-4 md:p-6 lg:p-8">Content</div>
```

---

## 🧪 Testing

### Component Testing

Using React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders component', () => {
  render(<MyComponent title="Test" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### API Mocking

```typescript
import { apiRequest } from './lib/api/config';

jest.mock('./lib/api/config');

test('loads data', async () => {
  (apiRequest as jest.Mock).mockResolvedValue([
    { id: '1', name: 'Product 1' },
  ]);
  
  // Your test
});
```

---

## 🚀 Performance Optimization

### Lazy Loading Pages

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/products" element={<Products />} />
  </Routes>
</Suspense>
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

// Expensive calculation
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Callback memoization
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com/)
- [Lucide Icons](https://lucide.dev/icons/)
- [Recharts](https://recharts.org/)

---

## 🎯 Best Practices

1. **Component Organization**: Keep components small and focused
2. **Type Safety**: Use TypeScript interfaces for all props
3. **Error Handling**: Always handle API errors gracefully
4. **Loading States**: Show loading indicators for async operations
5. **Accessibility**: Use semantic HTML and ARIA labels
6. **Code Reusability**: Extract common logic into hooks
7. **Performance**: Use React.memo for expensive components
8. **Security**: Never expose sensitive data in frontend code

---

For more help, refer to the inline code comments and example implementations.
