package com.smartattend.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.LowAttendanceStudent

class AdminLowAttendanceAdapter : ListAdapter<LowAttendanceStudent, AdminLowAttendanceAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvStudentName: TextView = view.findViewById(R.id.tvStudentName)
        val tvClass: TextView = view.findViewById(R.id.tvClass)
        val tvPercentage: TextView = view.findViewById(R.id.tvPercentage)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_low_attendance, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvStudentName.text = item.name
        holder.tvClass.text = listOfNotNull(item.className, item.section).joinToString(" ")
        holder.tvPercentage.text = "${String.format("%.1f", item.percentage)}%"
        holder.tvPercentage.setTextColor(
            androidx.core.content.ContextCompat.getColor(
                holder.itemView.context,
                if (item.percentage < 50) R.color.red_600 else R.color.amber_500
            )
        )
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<LowAttendanceStudent>() {
            override fun areItemsTheSame(a: LowAttendanceStudent, b: LowAttendanceStudent) = a.name == b.name && a.studentCode == b.studentCode
            override fun areContentsTheSame(a: LowAttendanceStudent, b: LowAttendanceStudent) = a == b
        }
    }
}
