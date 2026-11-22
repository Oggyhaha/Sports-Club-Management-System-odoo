import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Input from '../../components/forms/Input';
import PasswordInput from '../../components/forms/PasswordInput';
import Button from '../../components/common/Button';
import { getDefaultPortalPath, isPathPermittedForRoles } from '../../config/navigation';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to primary portal
  React.useEffect(() => {
    if (isAuthenticated && user?.roles) {
      const fromPath = location.state?.from?.pathname;
      const redirectPath = (fromPath && isPathPermittedForRoles(fromPath, user.roles))
        ? fromPath
        : getDefaultPortalPath(user.roles);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const result = await login(formData.email.trim(), formData.password);

      if (result.success) {
        showToast(`Welcome back, ${result.user.full_name}!`, 'success');
        const fromPath = location.state?.from?.pathname;
        const targetPath = (fromPath && isPathPermittedForRoles(fromPath, result.user.roles))
          ? fromPath
          : getDefaultPortalPath(result.user.roles);
        navigate(targetPath, { replace: true });
      } else {
        setServerError(result.message || 'Invalid email or password. Please try again.');
        showToast(result.message || 'Authentication failed', 'error');
      }
    } catch (err) {
      setServerError('An unexpected network error occurred. Please verify backend availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Sign In to Your Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your club member, staff, or executive portal
        </p>
      </div>

      {serverError && (
        <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email Address"
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          leftIcon={Mail}
        />

        <PasswordInput
          label="Password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isSubmitting}
            rightIcon={ArrowRight}
          >
            Sign In
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
        <div>
          <span>New to Champions Club? </span>
          <Link to="/register" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
            Register as Member
          </Link>
        </div>
        <div>
          <span>Have an invitation token? </span>
          <Link to="/accept-invitation" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
            Accept Staff Invitation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
