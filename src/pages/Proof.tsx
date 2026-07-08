      const { data: artifact, error } = await supabase
        .from("proof_artifacts")
        .insert({
          user_id: user.id,
          domain: domainValue,
          title: title.trim(),
          artifact_type: effectiveArtifactType,
          content,
          quality_score: score.qualityScore,
          evidence_strength: score.evidenceStrength,
          feedback: composedFeedback,
          next_upgrade: nextUpgrade.trim() || score.nextUpgrade,
          attachment_path: attachmentPath,
          attachment_url: attachmentUrl,
          attachment_type: attachment?.type ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_size: attachment?.size ?? null,
          pressure_flag: pressureFlag,
          transfer_flag: transferFlag,
          expected_strength: expectedStrength || null,
          calibration_result: calibrationResult || null,
        })
        .select()
        .single();