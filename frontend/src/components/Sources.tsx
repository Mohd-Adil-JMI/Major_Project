import { useEffect, useState } from "react";

const Sources = () => {
  const [fileLoading, setFileLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  async function handlePDFUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFileLoading(true);
    const file = (e.target as HTMLFormElement).file.files[0];
    console.log(file);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("http://localhost:3000/upload/pdf", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setFileLoading(false);
    (e.target as HTMLFormElement).reset();
    setSources(data.sources);
  }
  useEffect(() => {
    // fetch sources
    (async () => {
      const res = await fetch("http://localhost:3000/sources");
      const data = await res.json();
      console.log(data);
      setSources(data);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <h2 className="text-3xl">Knowledge Source</h2>
      <div className="flex gap-2">
        <form
          className="flex flex-col flex-wrap gap-2"
          onSubmit={handlePDFUpload}
        >
          <label htmlFor="file">Add PDF document</label>
          <div className="join">
            <input
              type="file"
              name="file"
              id="file"
              className="file-input w-full max-w-xs join-item"
            />
            <button className="btn btn-square join-item" type="submit">
              {fileLoading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
        <div className="flex flex-col gap-2">
          <label htmlFor="webpage">Add a Web URL</label>
          <div className="join">
            <input
              type="text"
              name="webpage"
              id="webpage"
              placeholder="Type here"
              className="input input-bordered w-full max-w-xs join-item"
            />
            <button className="btn btn-square join-item">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xl">Sources</h3>
          <ul className="list-disc list-inside">
            {sources.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Sources;
