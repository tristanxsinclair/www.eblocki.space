  const [expectedStrength, setExpectedStrength] = useState<"weak" | "moderate" | "strong" | "elite" | "">("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setReflection("");
    setNextUpgrade("");
    setLinkedContractId("");
    setArtifactType("");
    setAttachment(null);
    setAttachmentText("");
    setOriginalExtractedText("");
    setExtractedEdited(false);
    setAttachState(INITIAL_ATTACH);
    setPressureFlag(false);
    setTransferFlag(false);
    setExpectedStrength("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };