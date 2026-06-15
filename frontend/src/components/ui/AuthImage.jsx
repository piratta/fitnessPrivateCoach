import { useEffect, useState } from 'react';
import { reviewsApi, authHeaders } from '../../utils/api';

/**
 * Renders an image served from a token-protected endpoint. A plain <img src> cannot send the
 * Authorization header, so we fetch the bytes and expose them as an object URL.
 */
export default function AuthImage({ imageId, alt = '', style, className, onClick }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    setUrl(null);
    setFailed(false);

    fetch(reviewsApi.imageUrl(imageId), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !revoked && setFailed(true));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (failed) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        ⚠️
      </div>
    );
  }

  if (!url) {
    return <div className={className} style={{ ...style, background: 'rgba(255,255,255,0.05)' }} />;
  }

  return <img src={url} alt={alt} className={className} style={{ objectFit: 'cover', ...style }} onClick={onClick} />;
}
