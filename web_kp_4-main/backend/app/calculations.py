from math import acos, degrees

w_dict = {
    '1a': 0.1733, '1': 0.2345, '2': 0.359, '3': 0.3875, '4': 0.4895,
    '5': 0.6118, '6': 0.7444, '7': 0.8667, 'Ia': 0.1733, 'I': 0.2345,
    'II': 0.3059, 'III': 0.3875, 'IV': 0.4895, 'V': 0.6118, 'VI': 0.7444,
    'VII': 0.8667
}

k_dict = {
    'A': {
        '1': 0.75, '2': 1.00, '3': 1.25, '4': 1.50, '5': 1.70,
        '6': 1.85, '7': 2.00, '8': 2.25, '9': 2.45, '10': 2.65,
        '11': 2.75, '12': 2.75, '13': 2.75
    },
    'B': {
        '1': 0.5, '2': 0.65, '3': 0.85, '4': 1.10, '5': 1.30,
        '6': 1.45, '7': 1.60, '8': 1.90, '9': 2.10, '10': 2.30,
        '11': 2.50, '12': 2.75, '13': 2.75
    },
    'C': {
        '1': 0.40, '2': 0.40, '3': 0.55, '4': 0.80, '5': 1.00,
        '6': 1.15, '7': 1.25, '8': 1.55, '9': 1.80, '10': 2.00,
        '11': 2.20, '12': 2.35, '13': 2.75
    }
}

ripple_ratio_dict = {
    'A': {
        '1': 0.85, '2': 0.76, '3': 0.69, '4': 0.62, '5': 0.58,
        '6': 0.56, '7': 0.54, '8': 0.51, '9': 0.49, '10': 0.47,
        '11': 0.46, '12': 0.46, '13': 0.46
    },
    'B': {
        '1': 1.22, '2': 1.06, '3': 0.92, '4': 0.8, '5': 0.74,
        '6': 0.70, '7': 0.67, '8': 0.62, '9': 0.58, '10': 0.56,
        '11': 0.54, '12': 0.52, '13': 0.50
    },
    'C': {
        '1': 1.78, '2': 1.78, '3': 1.50, '4': 1.26, '5': 1.14,
        '6': 1.06, '7': 1.00, '8': 0.90, '9': 0.84, '10': 0.80,
        '11': 0.76, '12': 0.73, '13': 0.68
    }
}


def find_num_i(height_max):
    if height_max <= 5:
        return 2, 0
    elif 5 < height_max <= 10:
        return 2, (height_max - 5) / (10 - 5)
    elif 10 < height_max <= 20:
        return 3, (height_max - 10) / (20 - 10)
    elif 20 < height_max <= 40:
        return 4, (height_max - 20) / (40 - 20)
    elif 40 < height_max <= 60:
        return 5, (height_max - 40) / (60 - 40)
    elif 60 < height_max <= 80:
        return 6, (height_max - 60) / (80 - 60)
    elif 80 < height_max <= 100:
        return 7, (height_max - 80) / (100 - 80)
    elif 100 < height_max <= 150:
        return 8, (height_max - 100) / (150 - 100)
    elif 150 < height_max <= 200:
        return 9, (height_max - 150) / (200 - 150)
    elif 200 < height_max <= 250:
        return 10, (height_max - 200) / (250 - 200)
    elif 250 < height_max <= 300:
        return 11, (height_max - 250) / (300 - 250)
    elif 300 < height_max <= 350:
        return 12, (height_max - 300) / (350 - 300)
    else:
        return 13, 0


def find_correlation_coff(length):
    if length < 2:
        return 1.00
    elif 2 <= length < 5:
        return 0.85
    elif 5 <= length < 10:
        return 0.75
    else:
        return 0.65


def perform_calculations(data):
    # Calculate long and short sides
    long_window = data['long_side_1'] - data['long_side_2'] - data['long_side_2_1']
    long_side = data['long_side_1'] - data['long_side_3'] - data['long_side_3_1']
    short_window = data['short_side_1'] - data['short_side_2'] - data['short_side_2_1']
    short_side = data['short_side_1'] - data['short_side_3'] - data['short_side_3_1']

    # Calculate holder square
    holder_square = data['holder_a_side'] * data['holder_b_side'] / 1000000

    # Calculate length between nodes
    len_between_nodes = round(long_window / data['quantity_nodes'] * 2, 1)

    # Calculate wind coefficients
    w_0 = w_dict[data['wind_area']] * 100
    i_num, surplus = find_num_i(data['h_max'])
    i_num -= 1
    k_koef = k_dict[data['local_type']][str(i_num)] + surplus * (
            k_dict[data['local_type']][str(i_num + 1)] - k_dict[data['local_type']][str(i_num)])

    ripple_ratio = ripple_ratio_dict[data['local_type']][str(i_num)] - surplus * (
            ripple_ratio_dict[data['local_type']][str(i_num)] - ripple_ratio_dict[data['local_type']][str(i_num + 1)])

    correlation_coff = find_correlation_coff(len_between_nodes / 1000 * len_between_nodes / 1000)

    # Calculate wind peak load
    wind_peak_load = round(w_0 * k_koef * (1 + ripple_ratio) * correlation_coff * data['aero_coff'], 3)

    # Calculate areas
    s_hole = data['long_side_1'] * data['short_side_1'] / 1000
    s_window = ((data['long_side_1'] - data['long_side_2'] * 2) *
                (data['short_side_1'] - data['short_side_2'] * 2)) / 1000
    s_usefull = long_side * short_side / 1000
    s_effictive_1 = round(s_usefull / data['quantity_nodes'] / 1000 - holder_square, 4)
    s_effictive_wind_max = round((((data['long_side_2'] + data['long_side_3']) / 1000) +
                                  (len_between_nodes / 1000)) * data['short_side_1'] / 1000 / 2, 6)

    # Calculate pressures
    p_min = wind_peak_load * s_effictive_wind_max * data['koef_safety']
    p_max = s_effictive_1 * data['overpressure_opening']

    # Calculate angle
    s_perimetr = s_hole / 1000 * data['alpha_koef']
    perimetr = (data['long_side_1'] + data['short_side_1']) * 2 / 1000
    sling_len_calc = s_perimetr / perimetr * 1000
    sling_len_work = sling_len_calc + data['wall_thickness'] + data['hole_overlap'] + data['len_to_centre_construction']

    side = data['short_side_1'] if data['construction_oriented'] == "Горизонтально" else data['long_side_1']
    cos_a = (side * side + side * side - sling_len_calc * sling_len_calc) / (2 * side * side)
    cos_a = max(min(cos_a, 1), -1)
    angle_a = degrees(acos(cos_a))

    # Warnings
    warning = ""
    warning_2 = ""
    warning_angle = ""

    if p_max < 65:
        warning = "WARNING: Pmax < 65 Pa (too low)"
    elif p_max > 100:
        warning = "WARNING: Pmax > 100 Pa (too high)"
    else:
        warning = "OK: Pmax within limits (65-100 Pa)"

    if p_max < p_min:
        warning_2 = "CRITICAL: Pmax < Pmin"
    elif (p_max - 25) > p_min:
        warning_2 = f"Margin: {round(p_max - p_min, 2)} Pa (good)"
    else:
        warning_2 = f"Margin: {round(p_max - p_min, 2)} Pa (low)"

    if angle_a > 35:
        warning_angle = f"CRITICAL: Angle {round(angle_a, 2)}° > 35°"
    elif angle_a > 25:
        warning_angle = f"WARNING: Angle {round(angle_a, 2)}° > 25°"
    else:
        warning_angle = f"OK: Angle {round(angle_a, 2)}°"

    return {
        "long_side_usefull": long_side,
        "short_side_usefull": short_side,
        "long_window": long_window,
        "short_window": short_window,
        "s_hole": s_hole,
        "s_window": s_window,
        "s_usefull": s_usefull,
        "s_effictive_1": s_effictive_1,
        "s_effictive_wind_max": s_effictive_wind_max,
        "p_min": p_min,
        "p_max": p_max,
        "w_0": w_0,
        "wind_peak_load": wind_peak_load,
        "k_koef": k_koef,
        "ripple_ratio": ripple_ratio,
        "correlation_coff": correlation_coff,
        "angle_a": angle_a,
        "sling_len_work": sling_len_work,
        "len_between_nodes": len_between_nodes,
        "warning": warning,
        "warning_2": warning_2,
        "warning_angle_value": warning_angle
    }