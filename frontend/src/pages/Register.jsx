import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }

    const res = await register(name, email, password);
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
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-brandAccent/10 rounded-full blur-3xl animate-pulse-glow"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              Create <span className="text-brandAccent">Account</span>
            </h1>
            <p className="text-gray-400 text-sm">Join to track shared household expenses</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="glass-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="glass-input"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="glass-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="glass-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full glass-btn-primary mt-2"
            >
              {submitting ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brandAccent hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
