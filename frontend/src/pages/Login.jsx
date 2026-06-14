import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Check if session expired
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setSubmitting(false);
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md glass-panel p-8 relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-brandAccent/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              Shared Expenses <span className="text-brandAccent">Manager</span>
            </h1>
            <p className="text-gray-400 text-sm">Log in to manage flatmate bills and settlements</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="glass-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="glass-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full glass-btn-primary mt-2"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brandAccent hover:underline font-semibold">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
