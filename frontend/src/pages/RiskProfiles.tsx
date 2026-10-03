import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import {
  UserRiskProfile,
  DeviceRiskProfile,
  MerchantRiskProfile,
  ProfileStatsResponse,
} from '../types';
import { MOCK_RISK_PROFILES, extractSafeArray } from '../services/mockData';
import { ProfilesHeader } from '../components/profiles/ProfilesHeader';
import { ProfileKPIs } from '../components/profiles/ProfileKPIs';
import { UserProfileView } from '../components/profiles/UserProfileView';
import { DeviceProfileView } from '../components/profiles/DeviceProfileView';
import { MerchantProfileView } from '../components/profiles/MerchantProfileView';
import { Loader2 } from 'lucide-react';

export const RiskProfiles: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'users' | 'devices' | 'merchants') || 'users';

  const [activeTab, setActiveTab] = useState<'users' | 'devices' | 'merchants'>(initialTab);
  const [stats, setStats] = useState<ProfileStatsResponse | null>(null);

  // Users State
  const [userProfiles, setUserProfiles] = useState<UserRiskProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRiskProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRiskFilter, setUserRiskFilter] = useState('ALL');

  // Devices State
  const [deviceProfiles, setDeviceProfiles] = useState<DeviceRiskProfile[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceRiskProfile | null>(null);
  const [deviceSearch, setDeviceSearch] = useState('');

  // Merchants State
  const [merchantProfiles, setMerchantProfiles] = useState<MerchantRiskProfile[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantRiskProfile | null>(null);
  const [merchantSearch, setMerchantSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Sync tab with URL
  const handleTabChange = (tab: 'users' | 'devices' | 'merchants') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load KPI Stats
  const loadStats = async () => {
    try {
      const res = await apiClient.get<ProfileStatsResponse>('/risk-profiles/stats');
      if (res.data && typeof res.data.total_user_profiles === 'number') {
        setStats(res.data);
      } else {
        setStats({
          total_user_profiles: MOCK_RISK_PROFILES.length,
          high_risk_users: 2,
          total_devices: 12,
          shared_devices: 2,
          total_merchants: 6,
          high_risk_merchants: 1,
        });
      }
    } catch (err) {
      setStats({
        total_user_profiles: MOCK_RISK_PROFILES.length,
        high_risk_users: 2,
        total_devices: 12,
        shared_devices: 2,
        total_merchants: 6,
        high_risk_merchants: 1,
      });
    }
  };

  // Load User Profiles
  const loadUserProfiles = async () => {
    try {
      const res = await apiClient.get<UserRiskProfile[]>('/risk-profiles/users');
      const safe = extractSafeArray<UserRiskProfile>(res.data, MOCK_RISK_PROFILES);
      const finalUsers = safe.length > 0 ? safe : MOCK_RISK_PROFILES;
      setUserProfiles(finalUsers);
      if (finalUsers.length > 0 && !selectedUser) {
        setSelectedUser(finalUsers[0]);
      }
    } catch (err) {
      setUserProfiles(MOCK_RISK_PROFILES);
      if (!selectedUser) setSelectedUser(MOCK_RISK_PROFILES[0]);
    }
  };

  // Load Device Profiles
  const loadDeviceProfiles = async () => {
    try {
      const res = await apiClient.get<DeviceRiskProfile[]>('/risk-profiles/devices');
      const safe = extractSafeArray<DeviceRiskProfile>(res.data, []);
      setDeviceProfiles(safe);
      if (safe.length > 0 && !selectedDevice) {
        setSelectedDevice(safe[0]);
      }
    } catch (err) {
      setDeviceProfiles([]);
    }
  };

  // Load Merchant Profiles
  const loadMerchantProfiles = async () => {
    try {
      const res = await apiClient.get<MerchantRiskProfile[]>('/risk-profiles/merchants');
      const safe = extractSafeArray<MerchantRiskProfile>(res.data, []);
      setMerchantProfiles(safe);
      if (safe.length > 0 && !selectedMerchant) {
        setSelectedMerchant(safe[0]);
      }
    } catch (err) {
      setMerchantProfiles([]);
    }
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadStats(), loadUserProfiles(), loadDeviceProfiles(), loadMerchantProfiles()]);
      setIsLoading(false);
    };
    init();
  }, []);

  // Recalculate Profiles Action
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await apiClient.post('/risk-profiles/recalculate');
      await Promise.all([loadStats(), loadUserProfiles(), loadDeviceProfiles(), loadMerchantProfiles()]);
    } catch (err) {
      console.error('Failed to recalculate profiles:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Trigger */}
      <ProfilesHeader
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onRecalculate={handleRecalculate}
        isRecalculating={isRecalculating}
      />

      {/* Aggregate KPI Cards */}
      <ProfileKPIs stats={stats} isLoading={isLoading} />

      {/* Sub-Views */}
      {isLoading ? (
        <div className="bg-soc-card border border-soc-border rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-mono">Loading 360-degree behavioral intelligence...</span>
        </div>
      ) : (
        <>
          {activeTab === 'users' && (
            <UserProfileView
              userProfiles={userProfiles}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              search={userSearch}
              setSearch={setUserSearch}
              riskFilter={userRiskFilter}
              setRiskFilter={setUserRiskFilter}
            />
          )}

          {activeTab === 'devices' && (
            <DeviceProfileView
              deviceProfiles={deviceProfiles}
              selectedDevice={selectedDevice}
              onSelectDevice={setSelectedDevice}
              search={deviceSearch}
              setSearch={setDeviceSearch}
            />
          )}

          {activeTab === 'merchants' && (
            <MerchantProfileView
              merchantProfiles={merchantProfiles}
              selectedMerchant={selectedMerchant}
              onSelectMerchant={setSelectedMerchant}
              search={merchantSearch}
              setSearch={setMerchantSearch}
            />
          )}
        </>
      )}
    </div>
  );
};
