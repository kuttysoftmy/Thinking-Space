import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, Upload, Home, CheckSquare, Square, LogOut } from "lucide-react";

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      setIsAuthenticated(true);
      fetchImages();
    }
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: username, password }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem("adminToken", token);
        setIsAuthenticated(true);
        fetchImages();
      } else {
        setLoginError("Invalid ID or Password");
      }
    } catch(e) {
      setLoginError("Login failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setImages([]);
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      setImages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    
    try {
      await fetch(`/api/gallery/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      await fetchImages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("description", description);

    try {
      await fetch("/api/gallery", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      setFile(null);
      setDescription("");
      await fetchImages();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === images.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(images.map(img => img.id));
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} images?`)) return;
    
    setLoading(true);
    try {
      await fetch("/api/gallery/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ids: selectedIds }),
      });
      setSelectedIds([]);
      await fetchImages();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container login-container">
        <div className="login-card">
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin} className="upload-form">
            <div className="form-group">
              <label>ID</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                placeholder="Admin ID"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="Admin Password"
              />
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button type="submit" className="button submit-btn">Login</button>
          </form>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link to="/" style={{ color: "#aaa", textDecoration: "none" }}>&larr; Back to Site</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Gallery Admin Panel</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleLogout} className="button secondary-btn"><LogOut size={18} /> Logout</button>
          <Link to="/" className="button home-link"><Home size={18} /> View Site</Link>
        </div>
      </header>

      <div className="admin-content">
        <div className="upload-card">
          <h2>Upload New Image</h2>
          <form onSubmit={handleUpload} className="upload-form">
            <div className="form-group">
              <label>Select Image</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description (for AI search)</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the content of the image..."
                rows={3}
              />
            </div>

            <button type="submit" disabled={!file || uploading} className="button submit-btn">
              <Upload size={18} /> {uploading ? "Uploading..." : "Upload Image"}
            </button>
          </form>
        </div>

        <div className="gallery-list">
          <div className="gallery-header">
            <h2>Current Images ({images.length})</h2>
            <div className="gallery-actions">
              {images.length > 0 && (
                <button onClick={handleSelectAll} className="button secondary-btn">
                  {selectedIds.length === images.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  {selectedIds.length === images.length ? "Deselect All" : "Select All"}
                </button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={handleBatchDelete} className="button delete-btn">
                  <Trash2 size={16} /> Delete Selected ({selectedIds.length})
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <p className="loading">Loading...</p>
          ) : (
            <div className="grid">
              {images.map(img => {
                const isSelected = selectedIds.includes(img.id);
                return (
                <div key={img.id} className={`admin-card ${isSelected ? 'selected' : ''}`}>
                  <div className="checkbox-wrapper" onClick={() => toggleSelection(img.id)}>
                    {isSelected ? <CheckSquare size={20} className="checked" /> : <Square size={20} />}
                  </div>
                  <div className="img-wrapper" onClick={() => toggleSelection(img.id)}>
                    <img src={`/${img.id}`} alt={img.description} />
                  </div>
                  <div className="card-info">
                    <p className="description" title={img.description}>
                      {img.description || "No description"}
                    </p>
                    <button 
                      onClick={() => handleDelete(img.id)}
                      className="button delete-btn"
                      title="Delete Image"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
