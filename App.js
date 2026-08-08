import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

const PRODUCTS = [
  "Single Track",
  "2TT",
  "3TT",
  "4TT",
  "5TT",
  "3TT + Jalli",
  "4TT + Jalli",
  "5TT + Jalli",
];

const NEW_BAR_LENGTH = 144;

// =====================================================
// FRACTIONS
// =====================================================

function parseFraction(value) {
  if (!value) return 0;

  const text = value.toString().trim();

  if (text.includes(" ")) {
    const parts = text.split(/\s+/);
    const whole = Number(parts[0]) || 0;
    return whole + parseFraction(parts[1]);
  }

  if (text.includes("/")) {
    const parts = text.split("/");
    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);

    if (!denominator) return 0;

    return numerator / denominator;
  }

  return Number(text) || 0;
}

function gcd(a, b) {
  while (b) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

function formatFraction(value) {
  const rounded = Math.round(value * 16) / 16;

  let whole = Math.floor(rounded);
  let numerator = Math.round((rounded - whole) * 16);

  if (numerator === 16) {
    whole += 1;
    numerator = 0;
  }

  if (numerator === 0) {
    return `${whole}`;
  }

  const divisor = gcd(numerator, 16);

  const n = numerator / divisor;
  const d = 16 / divisor;

  if (whole === 0) {
    return `${n}/${d}`;
  }

  return `${whole} ${n}/${d}`;
}

function toUnits(value) {
  return Math.round(value * 16);
}

function fromUnits(value) {
  return value / 16;
}

// =====================================================
// REQUIRED CUT HELPERS
// =====================================================

function addCut(cuts, profile, size, qty) {
  if (!cuts[profile]) {
    cuts[profile] = [];
  }

  const roundedSize = fromUnits(toUnits(size));

  const existing = cuts[profile].find(
    (item) => toUnits(item.size) === toUnits(roundedSize)
  );

  if (existing) {
    existing.qty += qty;
  } else {
    cuts[profile].push({
      size: roundedSize,
      qty,
    });
  }
}

// =====================================================
// REQUIRED CUT CALCULATION
// =====================================================

function calculateRequiredCuts(windows) {
  const cuts = {};

  windows.forEach((window) => {
    const L = parseFraction(window.length);
    const W = parseFraction(window.width);
    const Q = Number(window.quantity);

    switch (window.product) {
      case "Single Track":
        addCut(cuts, "Single Track", L, 2 * Q);
        addCut(cuts, "Single Track", W, 2 * Q);

        addCut(cuts, "HDL", L, 2 * Q);
        addCut(cuts, "HDL", W, 2 * Q);
        break;

      case "2TT":
        addCut(cuts, "2TT", L, 2 * Q);
        addCut(cuts, "2TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 2, 4 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 2 * Q);
        break;

      case "3TT":
        addCut(cuts, "3TT", L, 2 * Q);
        addCut(cuts, "3TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 3, 6 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 4 * Q);
        break;

      case "4TT":
        addCut(cuts, "4TT", L, 2 * Q);
        addCut(cuts, "4TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 4, 8 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 6 * Q);
        break;

      case "5TT":
        addCut(cuts, "5TT", L, 2 * Q);
        addCut(cuts, "5TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 5, 10 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 8 * Q);
        break;

      case "3TT + Jalli":
        addCut(cuts, "3TT", L, 2 * Q);
        addCut(cuts, "3TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 2, 6 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 4 * Q);
        break;

      case "4TT + Jalli":
        addCut(cuts, "4TT", L, 2 * Q);
        addCut(cuts, "4TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 3, 8 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 6 * Q);
        break;

      case "5TT + Jalli":
        addCut(cuts, "5TT", L, 2 * Q);
        addCut(cuts, "5TT", W, 2 * Q);

        addCut(cuts, "HDL", L / 4, 10 * Q);
        addCut(cuts, "HDL", W, 2 * Q);

        addCut(cuts, "I/L", W, 8 * Q);
        break;

      default:
        break;
    }
  });

  return cuts;
}

// =====================================================
// EXPAND CUT LIST
// =====================================================

function expandCuts(profileCuts) {
  const list = [];

  profileCuts.forEach((item) => {
    for (let i = 0; i < item.qty; i++) {
      list.push(toUnits(item.size));
    }
  });

  return list;
}

// =====================================================
// BEST COMBINATION
// =====================================================

function findBestCombination(cuts, capacity) {
  if (!cuts.length) return [];

  const valid = [];

  cuts.forEach((cut, index) => {
    if (cut <= capacity) {
      valid.push({
        size: cut,
        originalIndex: index,
      });
    }
  });

  if (!valid.length) return [];

  const reachable = new Array(capacity + 1).fill(false);
  const prevSum = new Array(capacity + 1).fill(-1);
  const prevItem = new Array(capacity + 1).fill(-1);

  reachable[0] = true;

  for (let i = 0; i < valid.length; i++) {
    const size = valid[i].size;

    for (let s = capacity; s >= size; s--) {
      if (!reachable[s] && reachable[s - size]) {
        reachable[s] = true;
        prevSum[s] = s - size;
        prevItem[s] = i;
      }
    }

    if (reachable[capacity]) break;
  }

  let bestSum = capacity;

  while (bestSum > 0 && !reachable[bestSum]) {
    bestSum--;
  }

  if (bestSum === 0) return [];

  const selected = [];
  let current = bestSum;

  while (current > 0) {
    const validIndex = prevItem[current];

    if (validIndex < 0) break;

    selected.push(valid[validIndex].originalIndex);
    current = prevSum[current];
  }

  return selected;
}

function removeSelectedCuts(cuts, selectedIndexes) {
  const set = new Set(selectedIndexes);

  return cuts.filter((_, index) => !set.has(index));
}

// =====================================================
// DISPLAY CUTS
// =====================================================

function groupCuts(cuts) {
  const grouped = {};

  cuts.forEach((units) => {
    grouped[units] = (grouped[units] || 0) + 1;
  });

  return Object.keys(grouped)
    .map((key) => ({
      units: Number(key),
      qty: grouped[key],
    }))
    .sort((a, b) => b.units - a.units);
}

function cutsText(cuts) {
  return groupCuts(cuts)
    .map((item) => {
      const size = formatFraction(fromUnits(item.units));

      return item.qty === 1
        ? `${size}"`
        : `${size}" × ${item.qty}`;
    })
    .join(" + ");
}

// =====================================================
// OPTIMIZER
// =====================================================

function optimizeProfile(profile, profileCuts, existingStock) {
  let remainingCuts = expandCuts(profileCuts);

  remainingCuts.sort((a, b) => b - a);

  const plan = [];

  const profileStock = [];

  existingStock
    .filter((item) => item.profile === profile)
    .forEach((stock) => {
      for (let i = 0; i < stock.qty; i++) {
        profileStock.push(toUnits(stock.length));
      }
    });

  profileStock.sort((a, b) => a - b);

  // EXISTING STOCK FIRST
  profileStock.forEach((barUnits) => {
    if (!remainingCuts.length) return;

    const selectedIndexes = findBestCombination(
      remainingCuts,
      barUnits
    );

    if (!selectedIndexes.length) return;

    const selectedCuts = selectedIndexes.map(
      (index) => remainingCuts[index]
    );

    const used = selectedCuts.reduce((a, b) => a + b, 0);

    plan.push({
      source: "Existing",
      stockLength: barUnits,
      cuts: [...selectedCuts].sort((a, b) => b - a),
      used,
      balance: barUnits - used,
    });

    remainingCuts = removeSelectedCuts(
      remainingCuts,
      selectedIndexes
    );

    remainingCuts.sort((a, b) => b - a);
  });

  // NEW 144" STOCK
  const newBarUnits = toUnits(NEW_BAR_LENGTH);

  while (remainingCuts.length) {
    const tooLong = remainingCuts.find(
      (cut) => cut > newBarUnits
    );

    if (tooLong) {
      return {
        profile,
        plan,
        error: `${formatFraction(
          fromUnits(tooLong)
        )}" cut is longer than 144".`,
      };
    }

    const selectedIndexes = findBestCombination(
      remainingCuts,
      newBarUnits
    );

    if (!selectedIndexes.length) break;

    const selectedCuts = selectedIndexes.map(
      (index) => remainingCuts[index]
    );

    const used = selectedCuts.reduce((a, b) => a + b, 0);

    plan.push({
      source: "New",
      stockLength: newBarUnits,
      cuts: [...selectedCuts].sort((a, b) => b - a),
      used,
      balance: newBarUnits - used,
    });

    remainingCuts = removeSelectedCuts(
      remainingCuts,
      selectedIndexes
    );

    remainingCuts.sort((a, b) => b - a);
  }

  return {
    profile,
    plan,
    error: null,
  };
}

function optimizeProject(requiredCuts, existingStock) {
  return Object.keys(requiredCuts).map((profile) =>
    optimizeProfile(
      profile,
      requiredCuts[profile],
      existingStock
    )
  );
}

// =====================================================
// PROFILE TOTAL LENGTH
// =====================================================

function getProfileTotalLength(profileCuts) {
  return profileCuts.reduce(
    (total, item) => total + item.size * item.qty,
    0
  );
}

// =====================================================
// APP
// =====================================================

export default function App() {
  const [screen, setScreen] = useState("windows");

  const [selectedProduct, setSelectedProduct] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [windows, setWindows] = useState([]);
  const [requiredCuts, setRequiredCuts] = useState({});

  const [stockProfile, setStockProfile] = useState("");
  const [stockLength, setStockLength] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");

  const [existingStock, setExistingStock] = useState([]);
  const [cuttingPlan, setCuttingPlan] = useState([]);

  // Weight and price inputs by profile
  const [weightInputs, setWeightInputs] = useState({});
  const [priceInputs, setPriceInputs] = useState({});

  // ===================================================
  // WINDOW
  // ===================================================

  const addWindow = () => {
    if (!selectedProduct) {
      Alert.alert("Select Product", "Please select a product.");
      return;
    }

    const L = parseFraction(length);
    const W = parseFraction(width);
    const Q = Number(quantity);

    if (L <= 0 || W <= 0) {
      Alert.alert("Invalid Size", "Enter valid dimensions.");
      return;
    }

    if (!Number.isInteger(Q) || Q <= 0) {
      Alert.alert("Invalid Quantity", "Enter valid quantity.");
      return;
    }

    setWindows((old) => [
      ...old,
      {
        id: Date.now().toString() + Math.random(),
        product: selectedProduct,
        length: length.trim(),
        width: width.trim(),
        quantity: Q,
      },
    ]);

    setSelectedProduct("");
    setLength("");
    setWidth("");
    setQuantity("1");
  };

  const deleteWindow = (id) => {
    setWindows((old) =>
      old.filter((window) => window.id !== id)
    );
  };

  const goToRequiredCuts = () => {
    if (!windows.length) {
      Alert.alert("No Windows", "Add at least one window.");
      return;
    }

    const result = calculateRequiredCuts(windows);

    setRequiredCuts(result);
    setScreen("cuts");
  };

  // ===================================================
  // STOCK
  // ===================================================

  const addStock = () => {
    if (!stockProfile) {
      Alert.alert("Select Profile");
      return;
    }

    const stockValue = parseFraction(stockLength);
    const Q = Number(stockQuantity);

    if (stockValue <= 0) {
      Alert.alert("Invalid Length");
      return;
    }

    if (!Number.isInteger(Q) || Q <= 0) {
      Alert.alert("Invalid Quantity");
      return;
    }

    setExistingStock((old) => [
      ...old,
      {
        id: Date.now().toString() + Math.random(),
        profile: stockProfile,
        length: fromUnits(toUnits(stockValue)),
        qty: Q,
      },
    ]);

    setStockLength("");
    setStockQuantity("1");
  };

  const deleteStock = (id) => {
    setExistingStock((old) =>
      old.filter((item) => item.id !== id)
    );
  };

  const runOptimizer = () => {
    setCuttingPlan(
      optimizeProject(requiredCuts, existingStock)
    );

    setScreen("plan");
  };

  const resetProject = () => {
    setScreen("windows");

    setSelectedProduct("");
    setLength("");
    setWidth("");
    setQuantity("1");

    setWindows([]);
    setRequiredCuts({});

    setExistingStock([]);

    setStockProfile("");
    setStockLength("");
    setStockQuantity("1");

    setCuttingPlan([]);

    setWeightInputs({});
    setPriceInputs({});
  };

  // ===================================================
  // SCREEN 1 — WINDOWS
  // ===================================================

  if (screen === "windows") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>

          <Text style={styles.title}>
            Aluminium Window Calculator
          </Text>

          <Text style={styles.version}>V10.1</Text>

          <View style={styles.card}>

            <Text style={styles.sectionTitle}>
              Add Window
            </Text>

            <Text style={styles.label}>
              Select Product
            </Text>

            <View style={styles.productGrid}>
              {PRODUCTS.map((product) => (
                <TouchableOpacity
                  key={product}
                  style={[
                    styles.productButton,
                    selectedProduct === product &&
                      styles.productButtonSelected,
                  ]}
                  onPress={() => setSelectedProduct(product)}
                >
                  <Text
                    style={[
                      styles.productButtonText,
                      selectedProduct === product &&
                        styles.productButtonTextSelected,
                    ]}
                  >
                    {product}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              Window Length
            </Text>

            <TextInput
              style={styles.input}
              placeholder='Example: 120 or 120 1/2'
              value={length}
              onChangeText={setLength}
            />

            <Text style={styles.label}>
              Window Width
            </Text>

            <TextInput
              style={styles.input}
              placeholder='Example: 60 or 60 3/4'
              value={width}
              onChangeText={setWidth}
            />

            <Text style={styles.helperText}>
              Inches — fractions supported to 1/16"
            </Text>

            <Text style={styles.label}>
              Quantity
            </Text>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={addWindow}
            >
              <Text style={styles.primaryButtonText}>
                + Add Window
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.card}>

            <Text style={styles.sectionTitle}>
              Windows in Project
            </Text>

            {!windows.length ? (
              <Text style={styles.emptyText}>
                No windows added.
              </Text>
            ) : (
              windows.map((item, index) => (
                <View
                  key={item.id}
                  style={styles.itemCard}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smallText}>
                      Window #{index + 1}
                    </Text>

                    <Text style={styles.itemTitle}>
                      {item.product}
                    </Text>

                    <Text style={styles.itemSize}>
                      {item.length}" × {item.width}"
                    </Text>

                    <Text>
                      Qty: {item.quantity}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteWindow(item.id)}
                  >
                    <Text style={styles.deleteText}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={goToRequiredCuts}
          >
            <Text style={styles.primaryButtonText}>
              Next →
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===================================================
  // SCREEN 2 — REQUIRED CUTS
  // ===================================================

  if (screen === "cuts") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>

          <Text style={styles.title}>
            Required Cuts
          </Text>

          <Text style={styles.version}>
            Project Cutting Requirements
          </Text>

          {Object.keys(requiredCuts).map((profile) => (
            <View
              key={profile}
              style={styles.card}
            >
              <Text style={styles.profileTitle}>
                {profile}
              </Text>

              {[...requiredCuts[profile]]
                .sort((a, b) => b.size - a.size)
                .map((item, index) => (
                  <View
                    key={index}
                    style={styles.row}
                  >
                    <Text style={styles.cutLength}>
                      {formatFraction(item.size)}"
                    </Text>

                    <Text>
                      × {item.qty} pieces
                    </Text>
                  </View>
                ))}

              <View style={styles.totalLengthBox}>
                <Text style={styles.totalLengthText}>
                  Total Length:{" "}
                  {formatFraction(
                    getProfileTotalLength(
                      requiredCuts[profile]
                    )
                  )}
                  "
                </Text>
              </View>

            </View>
          ))}

          <View style={styles.navigationRow}>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen("windows")}
            >
              <Text style={styles.backText}>
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navNextButton}
              onPress={() => setScreen("stock")}
            >
              <Text style={styles.primaryButtonText}>
                Next →
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===================================================
  // SCREEN 3 — EXISTING STOCK
  // ===================================================

  if (screen === "stock") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>

          <Text style={styles.title}>
            Existing Stock
          </Text>

          <Text style={styles.version}>
            Optional — leave empty if none
          </Text>

          <View style={styles.card}>

            <Text style={styles.sectionTitle}>
              Add Stock
            </Text>

            <Text style={styles.label}>
              Select Profile
            </Text>

            <View style={styles.productGrid}>
              {Object.keys(requiredCuts).map((profile) => (
                <TouchableOpacity
                  key={profile}
                  style={[
                    styles.productButton,
                    stockProfile === profile &&
                      styles.productButtonSelected,
                  ]}
                  onPress={() => setStockProfile(profile)}
                >
                  <Text
                    style={[
                      styles.productButtonText,
                      stockProfile === profile &&
                        styles.productButtonTextSelected,
                    ]}
                  >
                    {profile}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              Stock Length
            </Text>

            <TextInput
              style={styles.input}
              placeholder='Example: 90 or 120 1/2'
              value={stockLength}
              onChangeText={setStockLength}
            />

            <Text style={styles.label}>
              Quantity
            </Text>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={stockQuantity}
              onChangeText={setStockQuantity}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={addStock}
            >
              <Text style={styles.primaryButtonText}>
                + Add Stock
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.card}>

            <Text style={styles.sectionTitle}>
              Stock Entered
            </Text>

            {!existingStock.length ? (
              <Text style={styles.emptyText}>
                No existing stock entered.
              </Text>
            ) : (
              existingStock.map((item, index) => (
                <View
                  key={item.id}
                  style={styles.itemCard}
                >
                  <View style={{ flex: 1 }}>

                    <Text style={styles.smallText}>
                      Stock #{index + 1}
                    </Text>

                    <Text style={styles.itemTitle}>
                      {item.profile}
                    </Text>

                    <Text style={styles.itemSize}>
                      {formatFraction(item.length)}"
                    </Text>

                    <Text>
                      Qty: {item.qty}
                    </Text>

                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteStock(item.id)}
                  >
                    <Text style={styles.deleteText}>
                      Delete
                    </Text>
                  </TouchableOpacity>

                </View>
              ))
            )}

          </View>

          <View style={styles.navigationRow}>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen("cuts")}
            >
              <Text style={styles.backText}>
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navNextButton}
              onPress={runOptimizer}
            >
              <Text style={styles.primaryButtonText}>
                Optimize →
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===================================================
  // SCREEN 4 — CUTTING PLAN
  // ===================================================

  if (screen === "plan") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>

          <Text style={styles.title}>
            Cutting Plan
          </Text>

          <Text style={styles.version}>
            Optimized Bar-by-Bar Plan
          </Text>

          {cuttingPlan.map((profileResult) => {
            const newBars =
              profileResult.plan.filter(
                (bar) => bar.source === "New"
              ).length;

            return (
              <View
                key={profileResult.profile}
                style={styles.profileSection}
              >

                <Text style={styles.bigProfileTitle}>
                  {profileResult.profile}
                </Text>

                <Text style={styles.profileInfo}>
                  New 144" Bars Required: {newBars}
                </Text>

                {profileResult.error ? (
                  <Text style={styles.errorText}>
                    {profileResult.error}
                  </Text>
                ) : null}

                {profileResult.plan.map((bar, index) => {

                  const stockLength =
                    fromUnits(bar.stockLength);

                  const used =
                    fromUnits(bar.used);

                  const balance =
                    fromUnits(bar.balance);

                  return (
                    <View
                      key={index}
                      style={styles.barCard}
                    >

                      <Text style={styles.barTitle}>
                        {bar.source === "Existing"
                          ? "Existing Stock"
                          : `New 144" Bar`}
                      </Text>

                      <Text style={styles.barLine}>
                        Stock Length:{" "}
                        {formatFraction(stockLength)}"
                      </Text>

                      <Text style={styles.barLine}>
                        Cuts: {cutsText(bar.cuts)}
                      </Text>

                      <Text style={styles.barLine}>
                        Used: {formatFraction(used)}"
                      </Text>

                      <Text style={styles.balanceText}>
                        Balance:{" "}
                        {formatFraction(balance)}"
                      </Text>

                    </View>
                  );
                })}

              </View>
            );
          })}

          <View style={styles.navigationRow}>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen("stock")}
            >
              <Text style={styles.backText}>
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navNextButton}
              onPress={() => setScreen("price")}
            >
              <Text style={styles.primaryButtonText}>
                Weight & Price →
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===================================================
  // SCREEN 5 — WEIGHT & PRICE
  // ===================================================

  let grandTotalWeight = 0;
  let grandTotalPrice = 0;

  const priceRows = Object.keys(requiredCuts).map(
    (profile) => {
      const totalLength =
        getProfileTotalLength(requiredCuts[profile]);

      const weightPer12Ft =
        Number(weightInputs[profile]) || 0;

      const pricePerKg =
        Number(priceInputs[profile]) || 0;

      const equivalent12Ft =
        totalLength / NEW_BAR_LENGTH;

      const totalWeight =
        equivalent12Ft * weightPer12Ft;

      const totalPrice =
        totalWeight * pricePerKg;

      grandTotalWeight += totalWeight;
      grandTotalPrice += totalPrice;

      return {
        profile,
        totalLength,
        equivalent12Ft,
        weightPer12Ft,
        totalWeight,
        pricePerKg,
        totalPrice,
      };
    }
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.title}>
          Weight & Price
        </Text>

        <Text style={styles.version}>
          Customer Material Calculation
        </Text>

        {priceRows.map((row) => (
          <View
            key={row.profile}
            style={styles.priceCard}
          >

            <Text style={styles.priceProfileTitle}>
              {row.profile}
            </Text>

            <View style={styles.priceResultRow}>
              <Text>Total Required Length</Text>

              <Text style={styles.bold}>
                {formatFraction(row.totalLength)}"
              </Text>
            </View>

            <View style={styles.priceResultRow}>
              <Text>12 ft Equivalent</Text>

              <Text style={styles.bold}>
                {row.equivalent12Ft.toFixed(3)}
              </Text>
            </View>

            <Text style={styles.label}>
              Weight per 12 ft (Kg)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: 4.25"
              keyboardType="decimal-pad"
              value={weightInputs[row.profile] || ""}
              onChangeText={(text) =>
                setWeightInputs((old) => ({
                  ...old,
                  [row.profile]: text,
                }))
              }
            />

            <View style={styles.calculationBox}>
              <Text style={styles.calculationLabel}>
                Total Weight
              </Text>

              <Text style={styles.calculationValue}>
                {row.totalWeight.toFixed(3)} Kg
              </Text>
            </View>

            <Text style={styles.label}>
              Price per Kg (₹)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: 320"
              keyboardType="decimal-pad"
              value={priceInputs[row.profile] || ""}
              onChangeText={(text) =>
                setPriceInputs((old) => ({
                  ...old,
                  [row.profile]: text,
                }))
              }
            />

            <View style={styles.totalPriceBox}>

              <Text style={styles.totalPriceLabel}>
                Total Price
              </Text>

              <Text style={styles.totalPriceValue}>
                ₹{row.totalPrice.toFixed(2)}
              </Text>

            </View>

          </View>
        ))}

        {/* GRAND TOTAL */}

        <View style={styles.grandTotalCard}>

          <Text style={styles.grandTitle}>
            GRAND TOTAL
          </Text>

          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>
              Total Weight
            </Text>

            <Text style={styles.grandValue}>
              {grandTotalWeight.toFixed(3)} Kg
            </Text>
          </View>

          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>
              Total Price
            </Text>

            <Text style={styles.grandPrice}>
              ₹{grandTotalPrice.toFixed(2)}
            </Text>
          </View>

        </View>

        <View style={styles.navigationRow}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("plan")}
          >
            <Text style={styles.backText}>
              ← Cutting Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navNextButton}
            onPress={() => {
              Alert.alert(
                "New Project",
                "Start a new project?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Start",
                    onPress: resetProject,
                  },
                ]
              );
            }}
          >
            <Text style={styles.primaryButtonText}>
              New Project
            </Text>
          </TouchableOpacity>

        </View>

        <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },

  container: {
    padding: 16,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },

  version: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
  },

  helperText: {
    fontSize: 12,
    marginTop: 5,
  },

  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  productButton: {
    width: "48%",
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#d6dbe0",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },

  productButtonSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  productButtonText: {
    fontWeight: "600",
  },

  productButtonTextSelected: {
    color: "#fff",
  },

  input: {
    borderWidth: 1,
    borderColor: "#d5dae0",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 17,
    backgroundColor: "#fafafa",
  },

  primaryButton: {
    backgroundColor: "#111827",
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  nextButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30,
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e5e9",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  smallText: {
    fontSize: 12,
  },

  itemTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },

  itemSize: {
    fontSize: 16,
    marginTop: 4,
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: "#cc3333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  deleteText: {
    color: "#cc3333",
    fontWeight: "700",
  },

  emptyText: {
    textAlign: "center",
    paddingVertical: 20,
  },

  profileTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },

  cutLength: {
    fontSize: 17,
    fontWeight: "700",
  },

  totalLengthBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#111827",
  },

  totalLengthText: {
    fontWeight: "800",
    fontSize: 16,
  },

  navigationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },

  backButton: {
    width: "47%",
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },

  backText: {
    fontWeight: "800",
  },

  navNextButton: {
    width: "47%",
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },

  profileSection: {
    marginBottom: 22,
  },

  bigProfileTitle: {
    fontSize: 24,
    fontWeight: "900",
  },

  profileInfo: {
    marginTop: 5,
    marginBottom: 10,
    fontWeight: "600",
  },

  barCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },

  barTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },

  barLine: {
    fontSize: 15,
    marginTop: 5,
    lineHeight: 21,
  },

  balanceText: {
    fontSize: 15,
    marginTop: 7,
    fontWeight: "800",
  },

  errorText: {
    color: "#b00020",
    marginBottom: 10,
    fontWeight: "700",
  },

  // ===================================================
  // WEIGHT + PRICE PAGE
  // ===================================================

  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },

  priceProfileTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  priceResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },

  bold: {
    fontWeight: "800",
  },

  calculationBox: {
    marginTop: 12,
    padding: 13,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  calculationLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  calculationValue: {
    fontSize: 17,
    fontWeight: "900",
  },

  totalPriceBox: {
    marginTop: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#111827",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalPriceLabel: {
    fontSize: 17,
    fontWeight: "900",
  },

  totalPriceValue: {
    fontSize: 19,
    fontWeight: "900",
  },

  grandTotalCard: {
    backgroundColor: "#111827",
    borderRadius: 15,
    padding: 18,
    marginBottom: 18,
  },

  grandTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },

  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },

  grandLabel: {
    color: "#fff",
    fontSize: 16,
  },

  grandValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  grandPrice: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
});