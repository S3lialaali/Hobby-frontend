import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {View,Text, TextInput,TouchableOpacity,Image,FlatList,ActivityIndicator,LayoutChangeEvent,} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import MapView, { Marker, Callout, LatLng } from 'react-native-maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchEstablishments } from '../../api/establishments';
import { resolveImageUrl } from '../../api/client';


// ---------- Types ----------
type Mode = 'list' | 'map';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type BackendEst = {
  id: number;
  name: string;
  category?: string | null;
  address?: string | null;
  area?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  ratings?: number | string | null;
  rating?: number | string | null;
  review_count?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

type CardEst = {
  id: string;
  name: string;
  image: any;
  rating: number;
  reviews: number;
  address: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
};


const ICON_BY_MODE = {
  list: 'map',
  map: 'list',
} as const satisfies Record<Mode, FeatherIconName>;

const PLACEHOLDER_IMG = require('../../assets/images/establishment_images/placeholder1.jpeg');

// ---------- Sort + Categories ----------
const SORT_FIELDS = [
  { key: 'rating', label: 'Rating' },   
  { key: 'name', label: 'Name' },       
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Popular' }, 
] as const;
type SortKey = typeof SORT_FIELDS[number]['key'];

function orderParamFor(sortKey: SortKey): string | undefined {
  switch (sortKey) {
    case 'rating':
      return 'rating_desc';
    case 'name':
      return 'name_desc';
    case 'newest':
      return 'newest';
    case 'popular':
      return 'clicks_desc';
    default:
      return undefined;
  }
}

const CATEGORY_OPTIONS = [
  'All',
  'Sports & fitness',
  'Water activities',
  'Arts & crafts',
  'Music & performing arts',
  'Cooking',
  'Technology & coding',
  'Languages',
  'Outdoor & adventure',
  'Chess & board games',
  'Photography & media',
  'Other',
];

// ---------- Small UI atoms ----------
function StarRow({ rating, count, compact = false }: { rating: number; count?: number; compact?: boolean }) {
  const r = Number.isFinite(rating) ? rating : 0;
  const full = Math.floor(r);
  const hasHalf = r - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'star';
    if (i === full && hasHalf) return 'star-half-full';
    return 'star-o';
  });

  return (
    <View className="flex-row items-center">
      {!compact && <Text className="text-[13px] font-semibold text-gray-900 mr-1">{r.toFixed(1)}</Text>}
      <View className="flex-row">
        {stars.map((name, idx) => (
          <FontAwesome key={idx} name={name as any} size={12} color="#111" style={{ marginRight: 2 }} />
        ))}
      </View>
      {typeof count === 'number' && <Text className="ml-1 text-[12px] text-gray-500">({count})</Text>}
    </View>
  );
}

function RatingBadge({ value }: { value: number }) {
  return (
    <View className="items-center">
      <View className="bg-black px-2 py-1 rounded-2xl">
        <Text className="text-white font-bold text-[12px]">{value.toFixed(1)}</Text>
      </View>
    </View>
  );
}


function DropdownOverlay({
  visible,
  top,
  children,
  onClose,
}: {
  visible: boolean;
  top: number;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <View className="absolute left-0 right-0 bottom-0 z-20" style={{ top }} pointerEvents="box-none">
      {/* Backdrop to close */}
      <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />
      {/* Panel */}
      <View className="px-5 mt-2">
        <View className="rounded-2xl border border-gray-200 bg-white overflow-hidden">{children}</View>
      </View>
    </View>
  );
}

function DropdownRow({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="px-4 py-3 border-b border-gray-100">
      <Text className={`text-[14px] ${active ? 'font-bold text-gray-900' : 'text-gray-800'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function SortIndicatorDesc() {
  return (
    <View className="absolute right-2.5 top-2.5">
      <Feather name="arrow-down" size={16} color="#7C3AED" />
    </View>
  );
}

function VenueCard({
  item,
  onPress,
  showSortIndicator,
}: {
  item: CardEst;
  onPress: () => void;
  showSortIndicator?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} className="mb-6">
      <View className="bg-white rounded-2xl overflow-hidden border border-gray-200">
        {showSortIndicator ? <SortIndicatorDesc /> : null}

        <Image source={item.image} className="w-full h-40" resizeMode="cover" />
        <View className="p-4">
          <View className="flex-row justify-between items-start">
            <Text className="flex-1 pr-3 text-[18px] font-extrabold text-gray-900">{item.name}</Text>
            <Text className="text-[13px] text-gray-700">{item.category}</Text>
          </View>
          <View className="mt-2 pb-1">
            <StarRow rating={item.rating} count={item.reviews} />
          </View>
          {!!item.address && <Text className="mt-1 text-[13px] text-gray-500">{item.address}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------- Data hooks ----------
function useEstablishments(query: string, sortKey: SortKey, category: string) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BackendEst[]>([]);

  const order = orderParamFor(sortKey);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEstablishments({
        status: 'approved',
        limit: 200,
        ...(order ? { order } : {}),
        ...(category && category !== 'All' ? { category } : {}),
        ...(query ? { q: query } : {}),
      });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [order, category, query]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, rows };
}

//  adapter
function adapt(rows: BackendEst[]): CardEst[] {
  return rows.map((e) => {
    const img = resolveImageUrl(e.image_url || e.logo_url || '');

    const ratingVal = Number(e.ratings ?? e.rating ?? 0);
    const rating = Number.isFinite(ratingVal) ? ratingVal : 0;

    const reviewsVal = Number(e.review_count ?? 0);
    const reviews = Number.isFinite(reviewsVal) ? reviewsVal : 0;

    const latVal = Number(e.lat);
    const lngVal = Number(e.lng);

    return {
      id: String(e.id),
      name: e.name ?? 'Establishment',
      image: img ? { uri: img } : PLACEHOLDER_IMG,
      rating,
      reviews,
      address: e.address || '',
      category: e.category || 'Hobby',
      lat: Number.isFinite(latVal) ? latVal : null,
      lng: Number.isFinite(lngVal) ? lngVal : null,
    };
  });
}

// ---------- Screen ----------
export default function SearchTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('list');

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [category, setCategory] = useState<string>('All');

  const [sortOpen, setSortOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const [headerHeight, setHeaderHeight] = useState<number>(0); 

  const mapRef = useRef<MapView | null>(null);

  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();
  useEffect(() => {
    if (typeof categoryParam === 'string' && CATEGORY_OPTIONS.includes(categoryParam)) {
      setCategory(categoryParam);
    } else if (categoryParam !== undefined) {
      setCategory('All');
    }
    // if no param, leave as current state (default 'All')
  }, [categoryParam]);

  const { loading, rows } = useEstablishments(query, sortKey, category);
  const ests = useMemo(() => adapt(rows), [rows]);

  const coords = useMemo<LatLng[]>(
    () =>
      ests
        .filter((e) => Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lng)))
        .map((e) => ({ latitude: Number(e.lat), longitude: Number(e.lng) })),
    [ests]
  );

  const fitAll = useCallback(() => {
    if (!mapRef.current || coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
      animated: true,
    });
  }, [coords]);

  const sortLabel = useMemo(
    () => SORT_FIELDS.find((s) => s.key === sortKey)?.label ?? 'Sort',
    [sortKey]
  );

  const searchTopPad = insets.top + 2;

  // Clear on blur (navigate away and back)
  useFocusEffect(
    useCallback(() => {
      return () => {
        // on blur, reset all
        setQuery('');
        setCategory('All');
        setSortKey('rating');
        setSortOpen(false);
        setCatOpen(false);
      };
    }, [])
  );

  // Clear when switching mode (map <-> list)
  const toggleMode = () => {
    const next: Mode = mode === 'list' ? 'map' : 'list';
    setMode(next);
    // reset search/filters and close dropdowns
    setQuery('');
    setCategory('All');
    setSortKey('rating');
    setSortOpen(false);
    setCatOpen(false);
  };

  // ---------- Header (Search + Filters container) ----------
  const HeaderContent = (
    <View onLayout={(e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height)} className="bg-white">
      {/* Search pill */}
      <View className="px-5" style={{ paddingTop: searchTopPad }}>
        <View className="flex-row items-center bg-white rounded-full border border-gray-200 px-3 py-2 shadow">
          <Feather name="search" size={18} color="#111" />
          <TextInput
            placeholder="Search Establishments..."
            value={query}
            onChangeText={setQuery}
            className="flex-1 ml-2 text-[14px] text-gray-900"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={toggleMode}
            className="ml-3 w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center"
            activeOpacity={0.8}
          >
            <Feather name={ICON_BY_MODE[mode]} size={16} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter pills row — fixed space to keep position stable */}
      {mode === 'list' && (
        <View className="px-5 my-1 pb-2 mt-1 pt-2">
          <View className="flex-row items-center">
            {/* Sort trigger */}
            <TouchableOpacity
              onPress={() => {
                setSortOpen((v) => !v);
                setCatOpen(false);
              }}
              activeOpacity={0.85}
              className="h-9 px-3 rounded-full border border-gray-300 bg-white mr-2 flex-row items-center"
            >
              <Text className="text-[13px] font-medium text-gray-900 mr-2">Sort: {sortLabel}</Text>
              <Feather name="chevron-down" size={14} color="#111" />
            </TouchableOpacity>

            {/* Category trigger */}
            <TouchableOpacity
              onPress={() => {
                setCatOpen((v) => !v);
                setSortOpen(false);
              }}
              activeOpacity={0.85}
              className="h-9 px-3 rounded-full border border-gray-300 bg-white mr-2 flex-row items-center"
            >
              <Text className="text-[13px] font-medium text-gray-900 mr-2">Categories: {category}</Text>
              <Feather name="chevron-down" size={14} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const SortDropdown = (
    <DropdownOverlay
      visible={sortOpen && mode === 'list'}
      top={headerHeight}
      onClose={() => setSortOpen(false)}
    >
      {SORT_FIELDS.map((s) => (
        <DropdownRow
          key={s.key}
          label={s.label}
          active={s.key === sortKey}
          onPress={() => {
            setSortKey(s.key);
            setSortOpen(false);
          }}
        />
      ))}
    </DropdownOverlay>
  );

  const CatDropdown = (
    <DropdownOverlay
      visible={catOpen && mode === 'list'}
      top={headerHeight}
      onClose={() => setCatOpen(false)}
    >
      {CATEGORY_OPTIONS.map((c) => (
        <DropdownRow
          key={c}
          label={c}
          active={c === category}
          onPress={() => {
            setCategory(c);
            setCatOpen(false);
          }}
        />
      ))}
    </DropdownOverlay>
  );

  // ---------- RENDER ----------
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {mode === 'list' ? (
        <View className="flex-1">
          {/* Dropdown overlays */}
          {SortDropdown}
          {CatDropdown}

          {loading ? (
            <FlatList<CardEst>
              data={[]}
              renderItem={() => null}
              ListHeaderComponent={<View>{HeaderContent}</View>}
              stickyHeaderIndices={[0]}
              keyExtractor={(_, idx) => String(idx)}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center mt-10">
                  <ActivityIndicator />
                  <Text className="mt-2 text-gray-600">Loading…</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 28 }}
            />
          ) : (
            <FlatList<CardEst>
              data={ests}
              keyExtractor={(it) => it.id}
              ListHeaderComponent={<View>{HeaderContent}</View>}
              stickyHeaderIndices={[0]}
              renderItem={({ item, index }) => (
                <View className="px-5">
                  <VenueCard
                    item={item}
                    showSortIndicator={index === 0}
                    onPress={() =>
                      router.push({
                        pathname: '/screens/establishment',
                        params: { id: item.id, name: item.name },
                      })
                    }
                  />
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 28 }}
              ListEmptyComponent={
                <View className="px-5 mt-8">
                  <Text className="text-gray-500">No results.</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // MAP MODE
        <View className="flex-1">
          {/* Overlay search bar */}
          <View className="absolute left-0 right-0 z-10">
            <View className="px-5" style={{ paddingTop: searchTopPad }}>
              <View className="flex-row items-center bg-white rounded-full border border-gray-200 px-3 py-2 shadow">
                <Feather name="search" size={18} color="#111" />
                <TextInput
                  placeholder="Search Establishments..."
                  value={query}
                  onChangeText={setQuery}
                  className="flex-1 ml-2 text-[14px] text-gray-900"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="search"
                />
                <TouchableOpacity
                  onPress={toggleMode}
                  className="ml-3 w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Feather name={ICON_BY_MODE[mode]} size={16} color="#111" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Full-screen map behind the overlay */}
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            onMapReady={fitAll}
            onLayout={fitAll}
            initialRegion={{
              latitude: 26.0667,
              longitude: 50.5577,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
          >
            {ests
              .filter((e) => Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lng)))
              .map((e) => (
                <Marker
                  key={e.id}
                  coordinate={{ latitude: Number(e.lat), longitude: Number(e.lng) }}
                  tracksViewChanges={false}
                >
                  <RatingBadge value={e.rating || 0} />
                  <Callout
                    tooltip
                    onPress={() =>
                      router.push({
                        pathname: '/screens/establishment',
                        params: { id: e.id, name: e.name },
                      })
                    }
                  >
                    {/* Mini card in callout */}
                    <View className="bg-white rounded-2xl overflow-hidden w-64 shadow">
                      <Image source={e.image} className="w-full h-24" resizeMode="cover" />
                      <View className="p-2.5">
                        <Text className="font-bold text-[14px]" numberOfLines={1}>
                          {e.name}
                        </Text>
                        <View className="mt-1">
                          <StarRow rating={e.rating} count={e.reviews} compact />
                        </View>
                        {!!e.address && (
                          <Text numberOfLines={2} className="mt-1.5 text-[12px] text-gray-600">
                            {e.address}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Callout>
                </Marker>
              ))}
          </MapView>
        </View>
      )}
    </SafeAreaView>
  );
}
