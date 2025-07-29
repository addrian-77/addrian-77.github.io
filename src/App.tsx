import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Clipboard,
} from 'react-feather'; // Install react-feather or replace icons

const API_KEY = 'AIzaSyAzrxHAX5Y1YF9vz1p0nhwZBaBwGHhhHQ0'; // <-- Replace with your key

type LinkEntry = {
  url: string;
  title: string;
  thumbnail: string;
  trackCount?: number; // make optional for videos
  editing: boolean;
};

export default function App() {
  const [newLink, setNewLink] = useState('');
  const [links, setLinks] = useState(() => {
    const saved = localStorage.getItem('youtubeLinks');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('youtubeLinks', JSON.stringify(links));
  }, [links]);

  function getPlaylistId(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // Priority: 'list' param in query string
      const listParam = urlObj.searchParams.get('list');
      if (listParam) return listParam;

      // Also support "https://www.youtube.com/playlist?list=..."
      if (urlObj.pathname === '/playlist') {
        return urlObj.searchParams.get('list');
      }

      return null;
    } catch {
      return null;
    }
  }

  function getVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const v = urlObj.searchParams.get('v');
      if (v) return v;
      if (urlObj.hostname === 'youtu.be') return urlObj.pathname.slice(1);
      return null;
    } catch {
      return null;
    }
  }

  interface PlaylistInfo {
    title: string;
    thumbnail: string;
    trackCount: number;
  }

  async function fetchPlaylistInfo(playlistId: string): Promise<PlaylistInfo> {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch playlist');
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        trackCount: item.contentDetails.itemCount,
      };
    }
    throw new Error('Playlist not found');
  }


  async function fetchVideoInfo(videoId: string) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`
    );
    const data = await res.json();
    if (data.items?.length > 0) {
      return {
        title: data.items[0].snippet.title,
        thumbnail: data.items[0].snippet.thumbnails.default.url,
      };
    }
    throw new Error('Video not found');
  }

  async function addLink() {
    if (!newLink.trim()) return;
    try {
      const playlistId = getPlaylistId(newLink);
      let info;

      if (playlistId) {
        info = await fetchPlaylistInfo(playlistId);
        setLinks((prev) => [
          ...prev,
          {
            url: newLink,
            title: info.title,
            thumbnail: info.thumbnail,
            trackCount: info.trackCount,
            editing: false,
          },
        ]);
      } else {
        const videoId = getVideoId(newLink);
        if (!videoId) throw new Error('Invalid YouTube URL');
        info = await fetchVideoInfo(videoId);
        setLinks((prev) => [
          ...prev,
          {
            url: newLink,
            title: info.title,
            thumbnail: info.thumbnail,
            editing: false,
          },
        ]);
      }
      setNewLink('');
    } catch (err) {
      alert((err as Error).message);
    }
  }


  function toggleEdit(index: number) {
    setLinks((prev) =>
      prev.map((link, i) =>
        i === index ? { ...link, editing: !link.editing } : link
      )
    );
  }

  function updateLink(index: number, newUrl: string) {
    setLinks((prev) =>
      prev.map((link, i) =>
        i === index ? { ...link, url: newUrl } : link
      )
    );
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied!');
    } catch {
      alert('Failed to copy.');
    }
  }

  // Small reusable Button components with Tailwind
  const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <button
      {...props}
      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
    >
      {props.children}
    </button>
  );

  const SmallButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <button
      {...props}
      className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center"
    >
      {props.children}
    </button>
  );

  const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
      {...props}
      className="flex-grow border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  );

  const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
    <div
      {...props}
      className="flex items-center justify-between border rounded px-3 py-2 shadow-sm w-full bg-white"
    />
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">YouTube Link Manager</h1>

      <div className="flex gap-2 w-full max-w-md mb-8">
        <Input
          placeholder="Enter YouTube video or playlist URL"
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addLink();
          }}
        />
        <Button onClick={addLink}>
          <Plus className="w-5 h-5" /> Add
        </Button>
      </div>

      <div className="space-y-3 w-full max-w-md">
        {links.map((link, index) => (
          <Card key={index}>
            <div className="flex items-center gap-3 w-full">
              <div>
                <img src={link.thumbnail} alt={link.title} />
                <h3 className="font-semibold">{link.title}</h3>
                {link.trackCount !== undefined && (
                  <p className="text-sm text-gray-600">{link.trackCount} tracks</p>
                )}
              </div>


              {link.editing ? (
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(index, e.target.value)}
                  onBlur={async () => {
                    // When done editing, try to update title/thumbnail again
                    try {
                      let info;
                      const playlistId = getPlaylistId(links[index].url);
                      if (playlistId) {
                        info = await fetchPlaylistInfo(playlistId);
                      } else {
                        const videoId = getVideoId(links[index].url);
                        if (!videoId) throw new Error('Invalid YouTube URL');
                        info = await fetchVideoInfo(videoId);
                      }
                      setLinks((prev) =>
                        prev.map((l, i) =>
                          i === index
                            ? {
                              ...l,
                              title: info.title,
                              thumbnail: info.thumbnail,
                              editing: false,
                              url: links[index].url,
                            }
                            : l
                        )
                      );
                    } catch (err) {
                      alert('Failed to update link info');
                      setLinks((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, editing: false } : l
                        )
                      );
                    }
                  }}
                  autoFocus
                />
              ) : (
                <div className="text-sm font-medium truncate flex-1"></div>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <SmallButton onClick={() => copyToClipboard(link.url)} title="Copy link">
                  <Clipboard className="w-4 h-4" />
                </SmallButton>
                <SmallButton onClick={() => toggleEdit(index)} title="Edit link">
                  <Edit className="w-4 h-4" />
                </SmallButton>
                <SmallButton onClick={() => removeLink(index)} title="Remove link">
                  <Trash2 className="w-4 h-4" />
                </SmallButton>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
