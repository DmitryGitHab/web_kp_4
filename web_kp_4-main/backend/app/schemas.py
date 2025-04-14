from pydantic import BaseModel
from typing import Optional

class CalculationBase(BaseModel):
    long_side_1: float
    long_side_2: float
    long_side_3: float
    long_side_2_1: float
    long_side_3_1: float
    short_side_1: float
    short_side_2: float
    short_side_3: float
    short_side_2_1: float
    short_side_3_1: float
    quantity_cons: int
    quantity_nodes: int
    quantity_uts: int
    holder_a_side: float
    holder_b_side: float
    wind_area: str
    local_type: str
    h_max: float
    aero_coff: float
    koef_safety: float
    overpressure_opening: float
    wall_thickness: float
    hole_overlap: float
    len_to_centre_construction: float
    alpha_koef: float
    construction_oriented: str
    lsk_name: str

class CalculationInput(CalculationBase):
    pass

class CalculationOutput(CalculationBase):
    id: int
    long_side_usefull: float
    short_side_usefull: float
    long_window: float
    short_window: float
    s_hole: float
    s_window: float
    s_usefull: float
    s_effictive_1: float
    s_effictive_wind_max: float
    p_min: float
    p_max: float
    w_0: float
    wind_peak_load: float
    k_koef: float
    ripple_ratio: float
    correlation_coff: float
    angle_a: float
    sling_len_work: float
    len_between_nodes: float
    warning: str
    warning_2: str
    warning_angle_value: str

    class Config:
        from_attributes = True