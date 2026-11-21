import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User, Phone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import authService from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';
import Input from '../../components/forms/Input';
import PasswordInput from '../../components/forms/PasswordInput';
import Button from '../../components/common/Button';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (new TextEncoder().encode(formData.password).length > 72) {
      newErrors.password = 'Password cannot exceed 72 bytes';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await authService.register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
      });

      setIsSuccess(true);
      showToast('Registration successful! You can now sign in.', 'success');
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Registration failed.';
      setServerError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Account Created Successfully</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Your public member account for <span className="font-semibold text-slate-700">{formData.email}</span> has been established. You can now sign in to browse court availability and book sessions.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/login')}
            rightIcon={ArrowRight}
          >
            Proceed to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Create Member Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Join Champions Club to reserve courts and access facilities
        </p>
      </div>

      {serverError && (
        <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <Input
          label="Full Name"
          id="full_name"
          name="full_name"
          placeholder="e.g. Rahul Sharma"
          required
          value={formData.full_name}
          onChange={handleChange}
          error={errors.full_name}
          leftIcon={User}
        />

        <Input
          label="Email Address"
          id="email"
          name="email"
          type="email"
          placeholder="rahul@example.com"
          required
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          leftIcon={Mail}
        />

        <Input
          label="Phone Number (Optional)"
          id="phone"
          name="phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={handleChange}
          leftIcon={Phone}
        />

        <PasswordInput
          label="Password"
          id="password"
          name="password"
          required
          helperText="Min 8 characters, maximum 72 bytes"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <PasswordInput
          label="Confirm Password"
          id="confirmPassword"
          name="confirmPassword"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
            rightIcon={ArrowRight}
          >
            Create Account
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
        <span>Already have an account? </span>
        <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
