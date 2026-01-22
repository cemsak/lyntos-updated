'use client';

/**
 * Tax Certificate Upload Hook
 * Sprint 7.4 - LYNTOS V2
 * Handles upload, parse, and confirm flow
 */

import { useState, useCallback } from 'react';
import { getAuthToken } from '../../_lib/auth';
import type { UploadResponse, TaxCertificateData, ConfirmResponse } from './types';

interface UseTaxCertificateOptions {
  clientId: string;
  onSuccess?: (data: TaxCertificateData) => void;
  onError?: (error: string) => void;
}

export function useTaxCertificate({ clientId, onSuccess, onError }: UseTaxCertificateOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/tax-certificate/upload?client_id=${encodeURIComponent(clientId)}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': getAuthToken() || '', // Dev auth header
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || json.message || 'Yükleme başarısız');
      }

      // Extract data from ResponseEnvelope
      const data = json.data || json;

      const result: UploadResponse = {
        success: data.success,
        requiresManualEntry: data.requires_manual_entry,
        message: data.message,
        validation: data.validation ? {
          isValid: data.validation.is_valid,
          errors: data.validation.errors || [],
          warnings: data.validation.warnings || [],
        } : undefined,
        parsedData: data.parsed_data ? {
          vkn: data.parsed_data.vkn,
          companyName: data.parsed_data.company_name,
          naceCode: data.parsed_data.nace_code,
          naceDescription: data.parsed_data.nace_description,
          taxOffice: data.parsed_data.tax_office,
          address: data.parsed_data.address,
          city: data.parsed_data.city,
          district: data.parsed_data.district,
          kvMatrah: data.parsed_data.kv_matrah,
          kvPaid: data.parsed_data.kv_paid,
          year: data.parsed_data.year,
        } : undefined,
        vknMatch: data.vkn_match,
        clientVkn: data.client_vkn,
        clientName: data.client_name,
        naceInfo: data.nace_info ? {
          code: data.nace_info.code,
          description: data.nace_info.description,
          sectorGroup: data.nace_info.sector_group,
          riskProfile: data.nace_info.risk_profile,
          kCriteria: data.nace_info.k_criteria || [],
          avgMargin: data.nace_info.avg_margin,
          riskWeight: data.nace_info.risk_weight,
        } : undefined,
        comparison: data.comparison ? {
          previousYear: data.comparison.previous_year,
          previousMatrah: data.comparison.previous_matrah,
          matrahChangePercent: data.comparison.matrah_change_percent,
        } : undefined,
      };

      setUploadResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yükleme başarısız';
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [clientId, onError]);

  const confirm = useCallback(async (data: TaxCertificateData): Promise<ConfirmResponse | null> => {
    setIsConfirming(true);
    setError(null);

    try {
      // Convert to snake_case for API
      const apiData = {
        vkn: data.vkn,
        company_name: data.companyName,
        nace_code: data.naceCode,
        nace_description: data.naceDescription,
        tax_office: data.taxOffice,
        address: data.address,
        city: data.city,
        district: data.district,
        kv_matrah: data.kvMatrah,
        kv_paid: data.kvPaid,
        year: data.year,
      };

      const response = await fetch(`/api/v1/tax-certificate/confirm?client_id=${encodeURIComponent(clientId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthToken() || '',
        },
        body: JSON.stringify(apiData),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || json.message || 'Kayıt başarısız');
      }

      const responseData = json.data || json;

      const result: ConfirmResponse = {
        success: responseData.success,
        certificateId: responseData.certificate_id,
        activatedKCriteria: responseData.activated_k_criteria,
        message: responseData.message,
      };

      onSuccess?.(data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kayıt başarısız';
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsConfirming(false);
    }
  }, [clientId, onSuccess, onError]);

  const reset = useCallback(() => {
    setUploadResult(null);
    setError(null);
  }, []);

  return {
    upload,
    confirm,
    reset,
    isUploading,
    isConfirming,
    uploadResult,
    error,
  };
}
